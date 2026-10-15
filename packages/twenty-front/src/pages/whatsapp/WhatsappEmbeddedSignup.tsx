import { useEffect, useState } from 'react';

import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { whatsappAppIdState } from '@/client-config/states/whatsappAppIdState';
import { whatsappEmbeddedSignupConfigIdState } from '@/client-config/states/whatsappEmbeddedSignupConfigIdState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const FACEBOOK_SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';
const FACEBOOK_SDK_VERSION = 'v25.0';
const TRUSTED_MESSAGE_ORIGINS = new Set([
  'https://www.facebook.com',
  'https://web.facebook.com',
]);

type SignupData = {
  phoneNumberId: string;
  wabaId: string;
};

const parseSignupData = (rawData: unknown): SignupData | null => {
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

const getWorkspaceOrigin = () => {
  const workspaceOrigin = new URLSearchParams(window.location.search).get(
    'workspaceOrigin',
  );

  if (!isNonEmptyString(workspaceOrigin)) {
    return null;
  }

  try {
    const parsedOrigin = new URL(workspaceOrigin);

    if (
      parsedOrigin.protocol !== 'https:' ||
      parsedOrigin.hostname === 'leapcrm.tech' ||
      !parsedOrigin.hostname.endsWith('.leapcrm.tech') ||
      parsedOrigin.origin !== workspaceOrigin
    ) {
      return null;
    }

    return parsedOrigin.origin;
  } catch {
    return null;
  }
};

export const WhatsappEmbeddedSignup = () => {
  const whatsappAppId = useAtomStateValue(whatsappAppIdState);
  const whatsappEmbeddedSignupConfigId = useAtomStateValue(
    whatsappEmbeddedSignupConfigIdState,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const workspaceOrigin = getWorkspaceOrigin();

  useEffect(() => {
    window.fbAsyncInit = () => {
      if (isNonEmptyString(whatsappAppId)) {
        window.FB?.init({
          appId: whatsappAppId,
          version: FACEBOOK_SDK_VERSION,
        });
        setIsSdkReady(true);
      }
    };

    const existingScript = document.querySelector(
      `script[src="${FACEBOOK_SDK_SRC}"]`,
    );

    if (!isDefined(existingScript)) {
      const script = document.createElement('script');

      script.src = FACEBOOK_SDK_SRC;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [whatsappAppId]);

  const startSignup = () => {
    if (
      !workspaceOrigin ||
      !isNonEmptyString(whatsappAppId) ||
      !isNonEmptyString(whatsappEmbeddedSignupConfigId)
    ) {
      setStatus(t`This WhatsApp connection link is invalid or not configured.`);

      return;
    }

    if (!isSdkReady || !isDefined(window.FB)) {
      setStatus(t`Meta is still loading. Please try again in a moment.`);

      return;
    }

    let code: string | null = null;
    let signupData: SignupData | null = null;
    let complete = false;

    const cleanup = () => window.removeEventListener('message', handleMessage);

    const completeSignup = () => {
      if (complete || !isNonEmptyString(code) || !isDefined(signupData)) {
        return;
      }

      complete = true;
      cleanup();
      window.opener?.postMessage(
        {
          source: 'leapcrm-whatsapp-embedded-signup',
          code,
          phoneNumberId: signupData.phoneNumberId,
          wabaId: signupData.wabaId,
        },
        workspaceOrigin,
      );
      window.close();
    };

    const handleMessage = (event: MessageEvent) => {
      if (!TRUSTED_MESSAGE_ORIGINS.has(event.origin)) {
        return;
      }

      const parsedSignupData = parseSignupData(event.data);

      if (isDefined(parsedSignupData)) {
        signupData = parsedSignupData;
        completeSignup();
      }
    };

    window.addEventListener('message', handleMessage);
    window.FB.login(
      (response: { authResponse?: { code?: string } }) => {
        if (!isNonEmptyString(response?.authResponse?.code)) {
          cleanup();
          setStatus(t`WhatsApp connection was cancelled.`);

          return;
        }

        code = response.authResponse.code;
        completeSignup();
      },
      {
        config_id: whatsappEmbeddedSignupConfigId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { version: 'v4' },
      },
    );
  };

  return (
    <main style={{ maxWidth: 480, margin: '15vh auto', padding: 24 }}>
      <h1>{t`Connect WhatsApp to Leap CRM`}</h1>
      <p>{t`Continue to Meta to choose the WhatsApp Business number for your workspace.`}</p>
      <button onClick={startSignup} type="button">
        {isSdkReady ? t`Continue with Meta` : t`Loading Meta...`}
      </button>
      {isDefined(status) && <p role="status">{status}</p>}
    </main>
  );
};
