import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Logger,
  Post,
  Query,
  type RawBodyRequest,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { type Request, type Response } from 'express';
import { ApiPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { type WhatsappWebhookPayload } from 'src/modules/whatsapp/types/whatsapp-webhook-payload.type';
import { verifyWhatsappWebhookSignature } from 'src/modules/whatsapp/utils/verify-whatsapp-webhook-signature.util';
import { WhatsappInboundMessageService } from 'src/modules/whatsapp/services/whatsapp-inbound-message.service';

// Public, unauthenticated by design — Meta calls this directly, there is no
// user session. Security comes from the verify-token handshake (GET) and the
// HMAC signature check (POST), not from an auth guard. Mirrors
// TlsCertAskController's "minimal public controller with a narrow security
// check" shape.
@Controller()
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(
    private readonly twentyConfigService: TwentyConfigService,
    private readonly whatsappInboundMessageService: WhatsappInboundMessageService,
  ) {}

  @Get(`${ApiPath.Webhooks}/whatsapp`)
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  verifyWebhook(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') verifyToken: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ): void {
    const expectedVerifyToken = this.twentyConfigService.get(
      'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
    );

    if (
      mode === 'subscribe' &&
      isNonEmptyString(verifyToken) &&
      isNonEmptyString(expectedVerifyToken) &&
      verifyToken === expectedVerifyToken
    ) {
      res
        .status(200)
        .type('text/plain')
        .send(challenge ?? '');

      return;
    }

    throw new ForbiddenException('WhatsApp webhook verification failed');
  }

  @Post(`${ApiPath.Webhooks}/whatsapp`)
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  handleWebhookEvent(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signatureHeader: string | undefined,
    @Res() res: Response,
  ): void {
    const appSecret = this.twentyConfigService.get('WHATSAPP_APP_SECRET');

    if (!isDefined(request.rawBody)) {
      throw new UnauthorizedException('Missing WhatsApp webhook body');
    }

    if (!isNonEmptyString(appSecret)) {
      this.logger.error(
        'WHATSAPP_APP_SECRET is not configured, rejecting webhook event',
      );

      throw new UnauthorizedException('WhatsApp webhook is not configured');
    }

    const isSignatureValid = verifyWhatsappWebhookSignature({
      rawBody: request.rawBody,
      signatureHeader,
      appSecret,
    });

    if (!isSignatureValid) {
      throw new UnauthorizedException('Invalid WhatsApp webhook signature');
    }

    let payload: WhatsappWebhookPayload;

    try {
      payload = JSON.parse(request.rawBody.toString('utf-8'));
    } catch {
      throw new UnauthorizedException('Malformed WhatsApp webhook payload');
    }

    // Meta requires a fast 200 ack — process the payload without awaiting it
    // so a slow downstream write (workspace lookup, person matching) can never
    // cause Meta to retry the same webhook call.
    this.whatsappInboundMessageService
      .processWebhookPayload(payload)
      .catch((error) => {
        this.logger.error(
          `Unhandled error processing WhatsApp webhook payload: ${
            error instanceof Error ? error.message : String(error)
          }`,
          error instanceof Error ? error.stack : undefined,
        );
      });

    res.status(200).send('EVENT_RECEIVED');
  }
}
