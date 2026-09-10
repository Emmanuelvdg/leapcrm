import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { AdminResolver } from 'src/engine/api/graphql/graphql-config/decorators/admin-resolver.decorator';
import { FIRST_PERIOD_UNIT_AMOUNT_CENTS } from 'src/engine/core-modules/subscription-billing/constants/first-period-price.constant';
import { SeatPriceDto } from 'src/engine/core-modules/subscription-billing/dtos/seat-price.dto';
import { TenantOverviewDTO } from 'src/engine/core-modules/subscription-billing/dtos/tenant-overview.dto';
import { UpdateSeatPriceInput } from 'src/engine/core-modules/subscription-billing/dtos/update-seat-price.input';
import { SubscriptionPlanService } from 'src/engine/core-modules/subscription-billing/services/subscription-plan.service';
import { WorkspaceSubscriptionService } from 'src/engine/core-modules/subscription-billing/services/workspace-subscription.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { AdminPanelGuard } from 'src/engine/guards/admin-panel-guard';

const DEFAULT_CURRENCY = 'usd';

@AdminResolver()
@UseGuards(AdminPanelGuard)
export class SubscriptionAdminResolver {
  constructor(
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly workspaceSubscriptionService: WorkspaceSubscriptionService,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  @Query(() => [TenantOverviewDTO])
  async adminTenantsOverview(): Promise<TenantOverviewDTO[]> {
    return this.workspaceSubscriptionService.getAllTenantsOverview();
  }

  @Query(() => SeatPriceDto, { nullable: true })
  async getCurrentSeatPrice(): Promise<SeatPriceDto | null> {
    const plan = await this.subscriptionPlanService.getCurrentPlan();

    if (!plan) {
      return null;
    }

    return {
      unitAmountCents: plan.unitAmountCents,
      currency: plan.currency,
      interval: plan.interval,
      firstPeriodUnitAmountCents: plan.firstPeriodCouponId
        ? FIRST_PERIOD_UNIT_AMOUNT_CENTS
        : null,
      isSyncedWithStripe: !!plan.stripePriceId,
    };
  }

  @Mutation(() => SeatPriceDto)
  async updateSeatPrice(
    @Args('input') input: UpdateSeatPriceInput,
  ): Promise<SeatPriceDto> {
    const currency =
      input.currency ??
      this.twentyConfigService.get('SUBSCRIPTION_CURRENCY') ??
      DEFAULT_CURRENCY;

    const plan = await this.subscriptionPlanService.setSeatPrice({
      unitAmountCents: input.unitAmountCents,
      currency,
    });

    return {
      unitAmountCents: plan.unitAmountCents,
      currency: plan.currency,
      interval: plan.interval,
      firstPeriodUnitAmountCents: plan.firstPeriodCouponId
        ? FIRST_PERIOD_UNIT_AMOUNT_CENTS
        : null,
      isSyncedWithStripe: !!plan.stripePriceId,
    };
  }
}
