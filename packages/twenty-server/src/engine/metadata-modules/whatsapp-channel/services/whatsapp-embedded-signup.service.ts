import { Injectable, Logger } from '@nestjs/common';

import { randomInt } from 'crypto';

import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WHATSAPP_GRAPH_API_VERSION } from 'src/modules/whatsapp/constants/whatsapp-graph-api-version.constant';

const GRAPH_API_BASE_URL = `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}`;

type WhatsappAccessTokenExchangeResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type WhatsappPhoneNumberResponse = {
  display_phone_number?: string;
  platform_type?: string;
};

export type CompleteWhatsappEmbeddedSignupResult = {
  accessToken: string;
  displayPhoneNumber: string | null;
};

// Wraps the Meta Graph API calls a tech provider must make right after
// WhatsApp Embedded Signup resolves in the browser (see useConnectWhatsapp.ts
// on the front end): exchange the short-lived `code` for a business token,
// subscribe our app to the customer's WABA so Meta sends us its webhooks, and
// register the phone number on Cloud API so it can send and receive.
// Mirrors WhatsappOutboundMessageService's plain-fetch usage of the Graph API.
@Injectable()
export class WhatsappEmbeddedSignupService {
  private readonly logger = new Logger(WhatsappEmbeddedSignupService.name);

  constructor(private readonly twentyConfigService: TwentyConfigService) {}

  async completeEmbeddedSignup({
    code,
    phoneNumberId,
    wabaId,
  }: {
    code: string;
    phoneNumberId: string;
    wabaId: string;
  }): Promise<CompleteWhatsappEmbeddedSignupResult> {
    const accessToken = await this.exchangeCodeForAccessToken(code);

    await this.postToGraphApi({
      path: `${wabaId}/subscribed_apps`,
      accessToken,
      action: 'webhook subscription',
    });

    const phoneNumber = await this.fetchPhoneNumber({
      phoneNumberId,
      accessToken,
    });

    // Reconnecting an already registered number must not re-register it: the
    // PIN below would no longer match the one set on the first connect.
    if (phoneNumber?.platform_type !== 'CLOUD_API') {
      await this.postToGraphApi({
        path: `${phoneNumberId}/register`,
        accessToken,
        body: {
          messaging_product: 'whatsapp',
          // Meta turns this into the number's two-step verification PIN. Not
          // kept: the business can reset it in WhatsApp Manager.
          pin: randomInt(0, 1_000_000).toString().padStart(6, '0'),
        },
        action: 'phone number registration',
      });
    }

    return {
      accessToken,
      displayPhoneNumber: phoneNumber?.display_phone_number ?? null,
    };
  }

  private async exchangeCodeForAccessToken(code: string): Promise<string> {
    const appId = this.twentyConfigService.get('WHATSAPP_APP_ID');
    const appSecret = this.twentyConfigService.get('WHATSAPP_APP_SECRET');

    if (!isNonEmptyString(appId) || !isNonEmptyString(appSecret)) {
      throw new Error(
        'WhatsApp Embedded Signup is not configured: WHATSAPP_APP_ID/WHATSAPP_APP_SECRET are missing.',
      );
    }

    const tokenExchangeUrl = new URL(
      `${GRAPH_API_BASE_URL}/oauth/access_token`,
    );

    tokenExchangeUrl.searchParams.set('client_id', appId);
    tokenExchangeUrl.searchParams.set('client_secret', appSecret);
    tokenExchangeUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenExchangeUrl.toString());
    const tokenResponseText = await tokenResponse.text();

    if (!tokenResponse.ok) {
      throw new Error(
        `WhatsApp Embedded Signup code exchange failed with status ${tokenResponse.status}: ${tokenResponseText}`,
      );
    }

    const parsedTokenResponse = JSON.parse(
      tokenResponseText,
    ) as WhatsappAccessTokenExchangeResponse;

    if (!isNonEmptyString(parsedTokenResponse.access_token)) {
      throw new Error(
        `WhatsApp Embedded Signup code exchange response is missing access_token: ${tokenResponseText}`,
      );
    }

    return parsedTokenResponse.access_token;
  }

  private async postToGraphApi({
    path,
    accessToken,
    body,
    action,
  }: {
    path: string;
    accessToken: string;
    body?: Record<string, string>;
    action: string;
  }): Promise<void> {
    const response = await fetch(`${GRAPH_API_BASE_URL}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: isDefined(body) ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `WhatsApp Embedded Signup ${action} failed with status ${response.status}: ${await response.text()}`,
      );
    }
  }

  // Best-effort: on failure registration is still attempted and the UI falls
  // back to the phone number id as its label.
  private async fetchPhoneNumber({
    phoneNumberId,
    accessToken,
  }: {
    phoneNumberId: string;
    accessToken: string;
  }): Promise<WhatsappPhoneNumberResponse | null> {
    try {
      const response = await fetch(
        `${GRAPH_API_BASE_URL}/${phoneNumberId}?fields=display_phone_number,platform_type`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as WhatsappPhoneNumberResponse;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch WhatsApp phone number ${phoneNumberId}: ${error}`,
      );

      return null;
    }
  }
}
