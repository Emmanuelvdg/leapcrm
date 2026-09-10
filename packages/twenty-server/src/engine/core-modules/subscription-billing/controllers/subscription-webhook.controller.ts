import {
  BadRequestException,
  Controller,
  Headers,
  Logger,
  Post,
  type RawBodyRequest,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import { type Request, type Response } from 'express';
import { ApiPath } from 'twenty-shared/types';

import { SubscriptionStripeService } from 'src/engine/core-modules/subscription-billing/services/subscription-stripe.service';
import { SubscriptionWebhookService } from 'src/engine/core-modules/subscription-billing/services/subscription-webhook.service';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';

// Deliberately a distinct path from the Enterprise billing module's
// `webhooks/stripe` — this is a completely separate Stripe integration.
@Controller()
export class SubscriptionWebhookController {
  private readonly logger = new Logger(SubscriptionWebhookController.name);

  constructor(
    private readonly subscriptionStripeService: SubscriptionStripeService,
    private readonly subscriptionWebhookService: SubscriptionWebhookService,
  ) {}

  @Post(`${ApiPath.Webhooks}/subscription-stripe`)
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): Promise<void> {
    if (!signature || !req.rawBody) {
      throw new BadRequestException('Missing Stripe signature or raw body');
    }

    const event = this.subscriptionStripeService.constructWebhookEvent(
      req.rawBody,
      signature,
    );

    await this.subscriptionWebhookService.handleEvent(event);

    res.status(200).send({ received: true }).end();
  }
}
