import { useCallback, useState } from 'react';

import { useMutation } from '@apollo/client/react';
import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { whatsappAppIdState } from '@/client-config/states/whatsappAppIdState';
import { whatsappEmbeddedSignupConfigIdState } from '@/client-config/states/whatsappEmbeddedSignupConfigIdState';
import { EXCHANGE_WHATSAPP_EMBEDDED_SIGNUP_CODE } from '@/settings/accounts/graphql/mutations/exchangeWhatsappEmbeddedSignupCode';
import { GET_WHATSAPP_CHANNELS } from '@/settings/accounts/graphql/queries/getWhatsappChannels';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const FACEBOOK_SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';
const FACEBOOK_SDK_VERSION = 'v21.0';

// Meta relays the Embedded Signup FINISH event via postMessage from one of
// these two origins depending on which FB domain rendered the popup.
const TRUSTED_MESSAGE_ORIGINS = new Set([
  'https://www.facebook.com',
  'https://web.facebook.com',
]);

// Popups abandoned mid-flow (closed tab, user never finishes) would otherwise
// leak the message listener for the rest of the session.
const EMBEDDED_SIGNUP_TIMEOUT_MS = 2 * 60 * 1000;

type WhatsappEmbeddedSignupData = {
  phoneNumberId: string;
  wabaId: string;
};

let facebookSdkLoadPromise: Promise<void> | null = null;

// Loads the FB JS SDK at most once per page load and resolves once
// FB.init() has run, regardless of how many components call connectWhatsapp().
const loadFacebookSdk = (appId: string): Promise<void> => {
  if (isDefined(facebookSdkLoadPromise)) {
    return facebookSdkLoadPromise;
  }

  facebookSdkLoadPromise = new Promise((resolve) => {
    if (isDefined(window.FB)) {
      resolve();

      return;
    }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        version: FACEBOOK_SDK_VERSION,
      });
      resolve();
    };

    const existingScript = document.querySelector(
      `script[src="${FACEBOOK_SDK_SRC}"]`,
    );

    if (isDefined(existingScript)) {
      return;
    }

    const script = document.createElement('script');

    script.src = FACEBOOK_SDK_SRC;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  });

  return facebookSdkLoadPromise;
};

// Meta's documented Embedded Signup postMessage shape:
// { type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH', data: { phone_number_id, waba_id, business_id } }
// Any parse failure or shape mismatch is ignored rather than thrown, since
// the window can receive unrelated postMessage traffic from the FB popup.
const parseWhatsappEmbeddedSignupMessage = (
  rawData: unknown,
): WhatsappEmbeddedSignupData | null => {
  try {
    const parsed =
      typeof rawData === 'string' ? (JSON.parse(rawData) as unknown) : rawData;

    if (!isDefined(parsed) || typeof parsed !== 'object') {
      return null;
    }

    const message = parsed as {
      type?: unknown;
      event?: unknown;
      data?: { phone_number_id?: unknown; waba_id?: unknown };
    };

    if (
      message.type !== 'WA_EMBEDDED_SIGNUP' ||
      message.event !== 'FINISH' ||
      !isNonEmptyString(message.data?.phone_number_id) ||
      !isNonEmptyString(message.data?.waba_id)
    ) {
      return null;
    }

    return {
      phoneNumberId: message.data.phone_number_id,
      wabaId: message.data.waba_id,
    };
  } catch {
    return null;
  }
};

// Drives Meta's WhatsApp Embedded Signup: a FB.login() popup that resolves
// in-page via postMessage while the tab stays open, so the normal
// authenticated Apollo client is available the whole time - this is a plain
// authenticated mutation, not a guarded public redirect-callback route.
export const useConnectWhatsapp = () => {
  const whatsappAppId = useAtomStateValue(whatsappAppIdState);
  const whatsappEmbeddedSignupConfigId = useAtomStateValue(
    whatsappEmbeddedSignupConfigIdState,
  );
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const [isConnecting, setIsConnecting] = useState(false);

  const [exchangeWhatsappEmbeddedSignupCode] = useMutation(
    EXCHANGE_WHATSAPP_EMBEDDED_SIGNUP_CODE,
    { refetchQueries: [{ query: GET_WHATSAPP_CHANNELS }] },
  );

  const connectWhatsapp = useCallback(async () => {
    if (
      !isNonEmptyString(whatsappAppId) ||
      !isNonEmptyString(whatsappEmbeddedSignupConfigId)
    ) {
      enqueueErrorSnackBar({
        message: t`WhatsApp connection is not configured for this instance`,
      });

      return;
    }

    setIsConnecting(true);

    await loadFacebookSdk(whatsappAppId);

    // Plain closure-scoped bookkeeping for this single connect attempt only -
    // not useRef, since it never drives a render and its lifetime is exactly
    // one popup round-trip, shared between the postMessage handler and the
    // FB.login callback below via ordinary closure, not React state.
    // The FB.login() callback's `code` and the postMessage's
    // phoneNumberId/wabaId can arrive in either order - whichever lands
    // first is buffered here, and the mutation only fires once both halves
    // are present.
    let pendingCode: string | null = null;
    let pendingSignupData: WhatsappEmbeddedSignupData | null = null;
    let isSettled = false;

    const handleMessage = (event: MessageEvent) => {
      if (!TRUSTED_MESSAGE_ORIGINS.has(event.origin)) {
        return;
      }

      const signupData = parseWhatsappEmbeddedSignupMessage(event.data);

      if (!isDefined(signupData)) {
        return;
      }

      pendingSignupData = signupData;
      void finishIfReady();
    };

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      window.clearTimeout(timeoutId);
    };

    const finishIfReady = async () => {
      if (
        isSettled ||
        !isNonEmptyString(pendingCode) ||
        !isDefined(pendingSignupData)
      ) {
        return;
      }

      isSettled = true;
      cleanup();

      try {
        await exchangeWhatsappEmbeddedSignupCode({
          variables: {
            input: {
              code: pendingCode,
              phoneNumberId: pendingSignupData.phoneNumberId,
              wabaId: pendingSignupData.wabaId,
            },
          },
        });
        enqueueSuccessSnackBar({ message: t`WhatsApp connected` });
      } catch (error) {
        if (error instanceof Error) {
          enqueueErrorSnackBar({ apolloError: error });
        } else {
          enqueueErrorSnackBar({ message: t`Failed to connect WhatsApp` });
        }
      } finally {
        setIsConnecting(false);
      }
    };

    // Registered before FB.login() is called so the listener is ready to
    // catch the postMessage event, which can fire before FB.login()'s own
    // callback resolves.
    window.addEventListener('message', handleMessage);

    const timeoutId = window.setTimeout(() => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      cleanup();
      setIsConnecting(false);
      enqueueErrorSnackBar({
        message: t`WhatsApp connection cancelled or timed out`,
      });
    }, EMBEDDED_SIGNUP_TIMEOUT_MS);

    window.FB?.login(
      (response: { authResponse?: { code?: string } }) => {
        if (isSettled) {
          return;
        }

        if (!isNonEmptyString(response?.authResponse?.code)) {
          isSettled = true;
          cleanup();
          setIsConnecting(false);
          enqueueErrorSnackBar({
            message: t`WhatsApp connection cancelled`,
          });

          return;
        }

        pendingCode = response.authResponse.code;
        void finishIfReady();
      },
      {
        config_id: whatsappEmbeddedSignupConfigId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '3',
        },
      },
    );
  }, [
    whatsappAppId,
    whatsappEmbeddedSignupConfigId,
    enqueueSuccessSnackBar,
    enqueueErrorSnackBar,
    exchangeWhatsappEmbeddedSignupCode,
  ]);

  return { connectWhatsapp, isConnecting };
};
