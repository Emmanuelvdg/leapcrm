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

const CONNECT_PAGE_URL = 'https://leapcrm.tech/whatsapp/embedded-signup';
const CONNECT_PAGE_ORIGIN = new URL(CONNECT_PAGE_URL).origin;
const EMBEDDED_SIGNUP_TIMEOUT_MS = 2 * 60 * 1000;

type WhatsappEmbeddedSignupResult = {
  source: 'leapcrm-whatsapp-embedded-signup';
  code: string;
  phoneNumberId: string;
  wabaId: string;
};

const parseSignupResult = (
  value: unknown,
): WhatsappEmbeddedSignupResult | null => {
  if (!isDefined(value) || typeof value !== 'object') {
    return null;
  }

  const result = value as Partial<WhatsappEmbeddedSignupResult>;

  if (
    result.source !== 'leapcrm-whatsapp-embedded-signup' ||
    !isNonEmptyString(result.code) ||
    !isNonEmptyString(result.phoneNumberId) ||
    !isNonEmptyString(result.wabaId)
  ) {
    return null;
  }

  return result as WhatsappEmbeddedSignupResult;
};

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

    const signupUrl = new URL(CONNECT_PAGE_URL);
    signupUrl.searchParams.set('workspaceOrigin', window.location.origin);
    const popup = window.open(
      signupUrl,
      'leapcrm-whatsapp-signup',
      'width=600,height=760',
    );

    if (!popup) {
      setIsConnecting(false);
      enqueueErrorSnackBar({ message: t`Allow popups to connect WhatsApp` });
      return;
    }

    await new Promise<void>((resolve) => {
      let settled = false;
      const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        window.clearInterval(popupCheck);
        window.clearTimeout(timeout);
      };
      const finish = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve();
        }
      };
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== CONNECT_PAGE_ORIGIN || event.source !== popup) {
          return;
        }

        const result = parseSignupResult(event.data);
        if (!isDefined(result)) {
          return;
        }

        finish();
        void exchangeWhatsappEmbeddedSignupCode({
          variables: {
            input: {
              code: result.code,
              phoneNumberId: result.phoneNumberId,
              wabaId: result.wabaId,
            },
          },
        })
          .then(
            () => enqueueSuccessSnackBar({ message: t`WhatsApp connected` }),
            (error: unknown) => {
              if (error instanceof Error) {
                enqueueErrorSnackBar({ apolloError: error });
              } else {
                enqueueErrorSnackBar({
                  message: t`Failed to connect WhatsApp`,
                });
              }
            },
          )
          .finally(() => setIsConnecting(false));
      };
      const popupCheck = window.setInterval(() => {
        if (popup.closed) {
          finish();
          setIsConnecting(false);
        }
      }, 500);
      const timeout = window.setTimeout(() => {
        popup.close();
        finish();
        setIsConnecting(false);
        enqueueErrorSnackBar({
          message: t`WhatsApp connection cancelled or timed out`,
        });
      }, EMBEDDED_SIGNUP_TIMEOUT_MS);

      window.addEventListener('message', handleMessage);
    });
  }, [
    whatsappAppId,
    whatsappEmbeddedSignupConfigId,
    enqueueSuccessSnackBar,
    enqueueErrorSnackBar,
    exchangeWhatsappEmbeddedSignupCode,
  ]);

  return { connectWhatsapp, isConnecting };
};
