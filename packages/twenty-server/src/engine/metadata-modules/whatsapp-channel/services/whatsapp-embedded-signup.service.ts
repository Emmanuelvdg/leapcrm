import { Injectable, Logger } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WHATSAPP_GRAPH_API_VERSION } from 'src/modules/whatsapp/constants/whatsapp-graph-api-version.constant';

type WhatsappAccessTokenExchangeResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type WhatsappPhoneNumberResponse = {
  display_phone_number?: string;
};

export type ExchangeWhatsappEmbeddedSignupCodeResult = {
  accessToken: string;
  displayPhoneNumber: string | null;
};

// Wraps the two Meta Graph API calls needed right after WhatsApp Embedded
// Signup resolves in the browser (see useConnectWhatsapp.ts on the front end):
// exchanging the short-lived `code` for a long-lived access token, then a
// best-effort read of the phone number's display value for a nicer UI label.
// Mirrors WhatsappOutboundMessageService's plain-fetch usage of the Graph API.
@Injectable()
export class WhatsappEmbeddedSignupService {
  private readonly logger = new Logger(WhatsappEmbeddedSignupService.name);

  constructor(private readonly twentyConfigService: TwentyConfigService) {}

  async exchangeCodeForAccessToken({
    code,
    phoneNumberId,
  }: {
    code: string;
    phoneNumberId: string;
  }): Promise<ExchangeWhatsappEmbeddedSignupCodeResult> {
    const appId = this.twentyConfigService.get('WHATSAPP_APP_ID');
    const appSecret = this.twentyConfigService.get('WHATSAPP_APP_SECRET');

    if (!isNonEmptyString(appId) || !isNonEmptyString(appSecret)) {
      throw new Error(
        'WhatsApp Embedded Signup is not configured: WHATSAPP_APP_ID/WHATSAPP_APP_SECRET are missing.',
      );
    }

    const tokenExchangeUrl = new URL(
      `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/oauth/access_token`,
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

    const displayPhoneNumber = await this.fetchDisplayPhoneNumber({
      phoneNumberId,
      accessToken: parsedTokenResponse.access_token,
    });

    return {
      accessToken: parsedTokenResponse.access_token,
      displayPhoneNumber,
    };
  }

  // Best-effort only - a nicer displayPhoneNumber is a UI nicety, not worth
  // failing the whole connection flow over.
  private async fetchDisplayPhoneNumber({
    phoneNumberId,
    accessToken,
  }: {
    phoneNumberId: string;
    accessToken: string;
  }): Promise<string | null> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${phoneNumberId}?fields=display_phone_number`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!response.ok) {
        return null;
      }

      const parsedResponse =
        (await response.json()) as WhatsappPhoneNumberResponse;

      return parsedResponse.display_phone_number ?? null;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch WhatsApp display phone number for ${phoneNumberId}: ${error}`,
      );

      return null;
    }
  }
}
