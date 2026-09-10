import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { FIRST_PERIOD_UNIT_AMOUNT_CENTS } from 'src/engine/core-modules/subscription-billing/constants/first-period-price.constant';
import { CheckoutSessionDto } from 'src/engine/core-modules/subscription-billing/dtos/checkout-session.dto';
import { CreateCheckoutSessionInput } from 'src/engine/core-modules/subscription-billing/dtos/create-checkout-session.input';
import { SeatPriceDto } from 'src/engine/core-modules/subscription-billing/dtos/seat-price.dto';
import { SubscriptionStatusDto } from 'src/engine/core-modules/subscription-billing/dtos/subscription-status.dto';
import { UpdateSubscriptionSeatsInput } from 'src/engine/core-modules/subscription-billing/dtos/update-subscription-seats.input';
import { SubscriptionPlanService } from 'src/engine/core-modules/subscription-billing/services/subscription-plan.service';
import { WorkspaceSubscriptionService } from 'src/engine/core-modules/subscription-billing/services/workspace-subscription.service';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

@MetadataResolver()
@UseGuards(WorkspaceAuthGuard)
export class SubscriptionResolver {
  constructor(
    private readonly workspaceSubscriptionService: WorkspaceSubscriptionService,
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly workspaceDomainsService: WorkspaceDomainsService,
  ) {}

  @Query(() => SubscriptionStatusDto)
  async mySubscriptionStatus(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<SubscriptionStatusDto> {
    return this.workspaceSubscriptionService.getStatus(workspace);
  }

  // Read-only, unlike the admin-only mutation — any workspace member can see
  // the current price so the paywall page can show it before checkout.
  @Query(() => SeatPriceDto, { nullable: true })
  async currentSeatPrice(): Promise<SeatPriceDto | null> {
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

  @UseGuards(SettingsPermissionGuard(PermissionFlagType.BILLING))
  @Mutation(() => CheckoutSessionDto)
  async createSubscriptionCheckoutSession(
    @Args('input') input: CreateCheckoutSessionInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: UserEntity,
  ): Promise<CheckoutSessionDto> {
    return this.workspaceSubscriptionService.createCheckoutSession({
      workspace,
      userEmail: user.email,
      seats: input.seats,
      successUrl: this.workspaceDomainsService
        .buildWorkspaceURL({
          workspace,
          pathname: '/subscription-required-success',
        })
        .toString(),
      cancelUrl: this.workspaceDomainsService
        .buildWorkspaceURL({ workspace, pathname: '/subscription-required' })
        .toString(),
    });
  }

  @UseGuards(SettingsPermissionGuard(PermissionFlagType.BILLING))
  @Mutation(() => CheckoutSessionDto)
  async createSubscriptionBillingPortalSession(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<CheckoutSessionDto> {
    return this.workspaceSubscriptionService.createBillingPortalSession({
      workspace,
      returnUrl: this.workspaceDomainsService
        .buildWorkspaceURL({
          workspace,
          pathname: '/settings/subscription-billing',
        })
        .toString(),
    });
  }

  @UseGuards(SettingsPermissionGuard(PermissionFlagType.BILLING))
  @Mutation(() => SubscriptionStatusDto)
  async updateSubscriptionSeats(
    @Args('input') input: UpdateSubscriptionSeatsInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<SubscriptionStatusDto> {
    await this.workspaceSubscriptionService.updateSeats({
      workspace,
      seats: input.seats,
    });

    return this.workspaceSubscriptionService.getStatus(workspace);
  }
}
