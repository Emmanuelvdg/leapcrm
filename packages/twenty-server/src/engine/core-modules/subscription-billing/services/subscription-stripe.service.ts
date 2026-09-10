import { Injectable, Logger } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import Stripe from 'stripe';

import { SubscriptionBillingException } from 'src/engine/core-modules/subscription-billing/subscription-billing.exception';
import { SubscriptionBillingExceptionCode } from 'src/engine/core-modules/subscription-billing/subscription-billing.exception';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

// Kept deliberately thin: only the handful of Stripe calls this feature
// needs, so it never has to import anything from the Enterprise-licensed
// `billing`/`billing-webhook` modules.
@Injectable()
export class SubscriptionStripeService {
  private readonly logger = new Logger(SubscriptionStripeService.name);
  private readonly stripe?: Stripe;

  constructor(private readonly twentyConfigService: TwentyConfigService) {
    const apiKey = this.twentyConfigService.get('SUBSCRIPTION_STRIPE_API_KEY');

    if (apiKey) {
      this.stripe = new Stripe(apiKey, {});
    }
  }

  isConfigured(): boolean {
    return !!this.stripe;
  }

  private getClientOrThrow(): Stripe {
    if (!this.stripe) {
      throw new SubscriptionBillingException(
        'Stripe is not configured for subscription billing',
        SubscriptionBillingExceptionCode.STRIPE_NOT_CONFIGURED,
        {
          userFriendlyMessage: msg`Stripe is not configured yet. Add a Stripe API key in the admin settings to enable live billing.`,
        },
      );
    }

    return this.stripe;
  }

  // tax_code is required on the account's Managed Payments settings
  // (enabled by default on new Stripe accounts) — without it, Checkout
  // Session creation fails at line_items validation, not at product creation.
  async createProduct(name: string): Promise<Stripe.Product> {
    return this.getClientOrThrow().products.create({
      name,
      tax_code: 'txcd_10103001',
    });
  }

  // Backfills tax_code onto a product created before this requirement was
  // discovered — idempotent, safe to call on every price update.
  async ensureProductTaxCode(productId: string): Promise<void> {
    await this.getClientOrThrow().products.update(productId, {
      tax_code: 'txcd_10103001',
    });
  }

  async createPrice({
    productId,
    unitAmountCents,
    currency,
    interval,
  }: {
    productId: string;
    unitAmountCents: number;
    currency: string;
    interval: string;
  }): Promise<Stripe.Price> {
    return this.getClientOrThrow().prices.create({
      product: productId,
      unit_amount: unitAmountCents,
      currency,
      recurring: { interval: interval as Stripe.Price.Recurring.Interval },
    });
  }

  async archivePrice(priceId: string): Promise<Stripe.Price> {
    return this.getClientOrThrow().prices.update(priceId, { active: false });
  }

  // A once-off coupon applied to a subscription's first invoice only —
  // distinct from a Stripe trial, since it charges a real (discounted)
  // amount immediately rather than charging nothing.
  async createFirstPeriodCoupon({
    amountOffCents,
    currency,
  }: {
    amountOffCents: number;
    currency: string;
  }): Promise<Stripe.Coupon> {
    return this.getClientOrThrow().coupons.create({
      amount_off: amountOffCents,
      currency,
      duration: 'once',
      name: 'First month intro price',
    });
  }

  async createCustomer({
    email,
    workspaceId,
  }: {
    email: string;
    workspaceId: string;
  }): Promise<Stripe.Customer> {
    return this.getClientOrThrow().customers.create({
      email,
      metadata: { workspaceId },
    });
  }

  async createCheckoutSession({
    customerId,
    priceId,
    quantity,
    trialDays,
    firstPeriodCouponId,
    successUrl,
    cancelUrl,
    workspaceId,
  }: {
    customerId: string;
    priceId: string;
    quantity: number;
    trialDays: number;
    firstPeriodCouponId?: string | null;
    successUrl: string;
    cancelUrl: string;
    workspaceId: string;
  }): Promise<Stripe.Checkout.Session> {
    return this.getClientOrThrow().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity }],
      ...(firstPeriodCouponId
        ? { discounts: [{ coupon: firstPeriodCouponId }] }
        : {}),
      subscription_data: {
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
        metadata: { workspaceId },
      },
      metadata: { workspaceId },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  async createBillingPortalSession({
    customerId,
    returnUrl,
  }: {
    customerId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    return this.getClientOrThrow().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async updateSubscriptionQuantity({
    subscriptionId,
    quantity,
  }: {
    subscriptionId: string;
    quantity: number;
  }): Promise<Stripe.Subscription> {
    const client = this.getClientOrThrow();
    const subscription = await client.subscriptions.retrieve(subscriptionId);
    const item = subscription.items.data[0];

    if (!item) {
      this.logger.warn(
        `Subscription ${subscriptionId} has no items, skipping quantity sync`,
      );

      return subscription;
    }

    return client.subscriptions.update(subscriptionId, {
      items: [{ id: item.id, quantity }],
    });
  }

  async retrieveSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    return this.getClientOrThrow().subscriptions.retrieve(subscriptionId);
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const client = this.getClientOrThrow();
    const webhookSecret = this.twentyConfigService.get(
      'SUBSCRIPTION_STRIPE_WEBHOOK_SECRET',
    );

    return client.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
