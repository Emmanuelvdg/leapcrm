import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { FIRST_PERIOD_UNIT_AMOUNT_CENTS } from 'src/engine/core-modules/subscription-billing/constants/first-period-price.constant';
import { SubscriptionPlanEntity } from 'src/engine/core-modules/subscription-billing/entities/subscription-plan.entity';
import { SubscriptionStripeService } from 'src/engine/core-modules/subscription-billing/services/subscription-stripe.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

const SUBSCRIPTION_PRODUCT_NAME = 'Leap CRM Subscription';

@Injectable()
export class SubscriptionPlanService {
  private readonly logger = new Logger(SubscriptionPlanService.name);

  constructor(
    @InjectRepository(SubscriptionPlanEntity)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlanEntity>,
    private readonly subscriptionStripeService: SubscriptionStripeService,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  async getCurrentPlan(): Promise<SubscriptionPlanEntity | null> {
    return this.subscriptionPlanRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  // Always persists the new price locally. Only attempts to push it to Stripe
  // when a key is configured, so an admin can set pricing before Stripe access
  // exists — `stripePriceId` stays null until a later sync.
  async setSeatPrice({
    unitAmountCents,
    currency,
  }: {
    unitAmountCents: number;
    currency: string;
  }): Promise<SubscriptionPlanEntity> {
    const previousPlan = await this.getCurrentPlan();

    let stripeProductId = previousPlan?.stripeProductId ?? null;
    let stripePriceId: string | null = null;
    let firstPeriodCouponId: string | null = null;

    if (this.subscriptionStripeService.isConfigured()) {
      if (!stripeProductId) {
        const product = await this.subscriptionStripeService.createProduct(
          SUBSCRIPTION_PRODUCT_NAME,
        );

        stripeProductId = product.id;
      } else {
        // Backfills tax_code onto a product created before this account's
        // Managed Payments requirement was discovered.
        await this.subscriptionStripeService.ensureProductTaxCode(
          stripeProductId,
        );
      }

      const price = await this.subscriptionStripeService.createPrice({
        productId: stripeProductId,
        unitAmountCents,
        currency,
        interval: 'month',
      });

      stripePriceId = price.id;

      if (previousPlan?.stripePriceId) {
        await this.subscriptionStripeService.archivePrice(
          previousPlan.stripePriceId,
        );
      }

      // Only worth discounting down to the intro price when the real price
      // is actually above it — otherwise there's nothing to take off.
      const amountOffCents = unitAmountCents - FIRST_PERIOD_UNIT_AMOUNT_CENTS;

      if (amountOffCents > 0) {
        const coupon = await this.subscriptionStripeService.createFirstPeriodCoupon(
          { amountOffCents, currency },
        );

        firstPeriodCouponId = coupon.id;
      }
    } else {
      this.logger.warn(
        'Stripe is not configured — saving seat price locally only',
      );
    }

    if (previousPlan) {
      await this.subscriptionPlanRepository.update(previousPlan.id, {
        isActive: false,
      });
    }

    return this.subscriptionPlanRepository.save(
      this.subscriptionPlanRepository.create({
        unitAmountCents,
        currency,
        interval: 'month',
        stripeProductId,
        stripePriceId,
        firstPeriodCouponId,
        isActive: true,
      }),
    );
  }
}
