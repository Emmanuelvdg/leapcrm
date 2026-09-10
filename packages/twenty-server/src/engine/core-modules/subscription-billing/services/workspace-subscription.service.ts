import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { msg } from '@lingui/core/macro';
import { Repository } from 'typeorm';

import { SubscriptionPlanService } from 'src/engine/core-modules/subscription-billing/services/subscription-plan.service';
import { SubscriptionStripeService } from 'src/engine/core-modules/subscription-billing/services/subscription-stripe.service';
import { SubscriptionBillingException } from 'src/engine/core-modules/subscription-billing/subscription-billing.exception';
import { SubscriptionBillingExceptionCode } from 'src/engine/core-modules/subscription-billing/subscription-billing.exception';
import { TenantOverviewDTO } from 'src/engine/core-modules/subscription-billing/dtos/tenant-overview.dto';
import { WorkspaceSubscriptionEntity } from 'src/engine/core-modules/subscription-billing/entities/workspace-subscription.entity';
import { WorkspaceSubscriptionStatus } from 'src/engine/core-modules/subscription-billing/enums/workspace-subscription-status.enum';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

export type WorkspaceSubscriptionStatusResult = {
  status: WorkspaceSubscriptionStatus;
  isLocked: boolean;
  trialEnd: Date | null;
  currentPeriodEnd: Date | null;
  seats: number;
  activeMembers: number;
};

const ACCESS_GRANTING_STATUSES = new Set<WorkspaceSubscriptionStatus>([
  WorkspaceSubscriptionStatus.TRIALING,
  WorkspaceSubscriptionStatus.ACTIVE,
]);

@Injectable()
export class WorkspaceSubscriptionService {
  private readonly logger = new Logger(WorkspaceSubscriptionService.name);

  constructor(
    @InjectRepository(WorkspaceSubscriptionEntity)
    private readonly workspaceSubscriptionRepository: Repository<WorkspaceSubscriptionEntity>,
    @InjectRepository(UserWorkspaceEntity)
    private readonly userWorkspaceRepository: Repository<UserWorkspaceEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly subscriptionStripeService: SubscriptionStripeService,
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  // Actual invited/joined members — distinct from `seats`, which is the
  // purchased capacity a workspace is billed for and may exceed this count.
  async countActiveMembers(workspaceId: string): Promise<number> {
    return this.userWorkspaceRepository.count({ where: { workspaceId } });
  }

  // Permanently exempts workspaces that existed before the paywall was
  // introduced, so retrofitting billing doesn't suddenly demand payment from
  // an existing customer base.
  private isGrandfathered(workspace: WorkspaceEntity): boolean {
    const cutoff = this.twentyConfigService.get(
      'SUBSCRIPTION_GRANDFATHER_BEFORE',
    );

    if (!cutoff) {
      return false;
    }

    const cutoffDate = new Date(cutoff);

    return (
      !Number.isNaN(cutoffDate.getTime()) && workspace.createdAt < cutoffDate
    );
  }

  // A workspace with no subscription row has never checked out, so it's
  // locked until it does — the 30-day trial itself only starts once Stripe
  // Checkout runs (trial_period_days), not on the passage of time alone.
  // Self-gated on the feature flag and on Stripe being configured, so a
  // misconfigured or disabled instance never bricks itself.
  async getStatus(
    workspace: WorkspaceEntity,
  ): Promise<WorkspaceSubscriptionStatusResult> {
    const activeMembers = await this.countActiveMembers(workspace.id);

    if (
      !this.twentyConfigService.get('IS_SUBSCRIPTION_BILLING_ENABLED') ||
      !this.subscriptionStripeService.isConfigured() ||
      this.isGrandfathered(workspace)
    ) {
      return {
        status: WorkspaceSubscriptionStatus.ACTIVE,
        isLocked: false,
        trialEnd: null,
        currentPeriodEnd: null,
        seats: activeMembers,
        activeMembers,
      };
    }

    const existing = await this.workspaceSubscriptionRepository.findOne({
      where: { workspaceId: workspace.id },
    });

    if (!existing) {
      return {
        status: WorkspaceSubscriptionStatus.INCOMPLETE,
        isLocked: true,
        trialEnd: null,
        currentPeriodEnd: null,
        seats: 0,
        activeMembers,
      };
    }

    const isLockedTrial =
      existing.status === WorkspaceSubscriptionStatus.TRIALING &&
      !!existing.trialEnd &&
      new Date() > existing.trialEnd;

    return {
      status: existing.status,
      isLocked:
        isLockedTrial || !ACCESS_GRANTING_STATUSES.has(existing.status),
      trialEnd: existing.trialEnd ?? null,
      currentPeriodEnd: existing.currentPeriodEnd ?? null,
      seats: existing.seats,
      activeMembers,
    };
  }

  async findOrCreateForWorkspace(
    workspaceId: string,
  ): Promise<WorkspaceSubscriptionEntity> {
    const existing = await this.workspaceSubscriptionRepository.findOne({
      where: { workspaceId },
    });

    if (existing) {
      return existing;
    }

    return this.workspaceSubscriptionRepository.save(
      this.workspaceSubscriptionRepository.create({
        workspaceId,
        status: WorkspaceSubscriptionStatus.TRIALING,
        seats: 0,
      }),
    );
  }

  // Blocks any action that would add a member beyond the purchased seat
  // count. Used at invite-send time and at the moment a member actually
  // joins — a purchased seat is a hard cap, not an auto-scaling quantity.
  async assertSeatAvailable({
    workspaceId,
    additionalSeatsNeeded = 1,
  }: {
    workspaceId: string;
    additionalSeatsNeeded?: number;
  }): Promise<void> {
    if (!this.twentyConfigService.get('IS_SUBSCRIPTION_BILLING_ENABLED')) {
      return;
    }

    const record = await this.workspaceSubscriptionRepository.findOne({
      where: { workspaceId },
    });

    if (!record || !ACCESS_GRANTING_STATUSES.has(record.status)) {
      return;
    }

    const activeMembers = await this.countActiveMembers(workspaceId);

    if (activeMembers + additionalSeatsNeeded > record.seats) {
      throw new SubscriptionBillingException(
        `Workspace ${workspaceId} has no seats available (${activeMembers}/${record.seats} used)`,
        SubscriptionBillingExceptionCode.NO_SEATS_AVAILABLE,
        {
          userFriendlyMessage: msg`You've used all your purchased seats. Add more seats in Settings → Billing to invite another member.`,
        },
      );
    }
  }

  async createCheckoutSession({
    workspace,
    userEmail,
    seats,
    successUrl,
    cancelUrl,
  }: {
    workspace: WorkspaceEntity;
    userEmail: string;
    seats: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    const record = await this.findOrCreateForWorkspace(workspace.id);

    if (record.stripeSubscriptionId) {
      throw new SubscriptionBillingException(
        `Workspace ${workspace.id} already has a Stripe subscription`,
        SubscriptionBillingExceptionCode.SUBSCRIPTION_ALREADY_EXISTS,
        {
          userFriendlyMessage: msg`This workspace already has an active subscription.`,
        },
      );
    }

    const activeMembers = await this.countActiveMembers(workspace.id);

    if (seats < activeMembers) {
      throw new SubscriptionBillingException(
        `Requested ${seats} seats but workspace already has ${activeMembers} members`,
        SubscriptionBillingExceptionCode.NO_SEATS_AVAILABLE,
        {
          userFriendlyMessage: msg`You have more members than that already — pick at least ${activeMembers} seats.`,
        },
      );
    }

    const plan = await this.subscriptionPlanService.getCurrentPlan();

    if (!plan?.stripePriceId) {
      throw new SubscriptionBillingException(
        'No active Stripe-synced subscription plan',
        SubscriptionBillingExceptionCode.NO_ACTIVE_PLAN,
        {
          userFriendlyMessage: msg`Billing isn't fully set up yet — please contact support.`,
        },
      );
    }

    let stripeCustomerId = record.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await this.subscriptionStripeService.createCustomer({
        email: userEmail,
        workspaceId: workspace.id,
      });

      stripeCustomerId = customer.id;
      await this.workspaceSubscriptionRepository.update(record.id, {
        stripeCustomerId,
      });
    }

    const trialDays = this.twentyConfigService.get('SUBSCRIPTION_TRIAL_DAYS');
    const quantity = Math.max(seats, 1);

    const session = await this.subscriptionStripeService.createCheckoutSession(
      {
        customerId: stripeCustomerId,
        priceId: plan.stripePriceId,
        quantity,
        trialDays,
        firstPeriodCouponId: plan.firstPeriodCouponId,
        successUrl,
        cancelUrl,
        workspaceId: workspace.id,
      },
    );

    if (!session.url) {
      throw new SubscriptionBillingException(
        'Stripe did not return a checkout session URL',
        SubscriptionBillingExceptionCode.NO_ACTIVE_PLAN,
        {
          userFriendlyMessage: msg`Couldn't start checkout — please try again.`,
        },
      );
    }

    // Optimistic, same as the TRIALING status findOrCreateForWorkspace already
    // assigns before Stripe confirms anything: the webhook (handleSubscriptionUpdated)
    // overwrites this with Stripe's authoritative quantity once it fires, but
    // without this a customer who just paid is stuck at seats: 0 — unable to
    // invite anyone, or even skip the invite step — for however long webhook
    // delivery takes.
    await this.workspaceSubscriptionRepository.update(record.id, {
      seats: quantity,
    });

    return { url: session.url };
  }

  async createBillingPortalSession({
    workspace,
    returnUrl,
  }: {
    workspace: WorkspaceEntity;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const record = await this.workspaceSubscriptionRepository.findOne({
      where: { workspaceId: workspace.id },
    });

    if (!record?.stripeCustomerId) {
      throw new SubscriptionBillingException(
        `Workspace ${workspace.id} has no Stripe customer yet`,
        SubscriptionBillingExceptionCode.NO_STRIPE_CUSTOMER,
        {
          userFriendlyMessage: msg`Subscribe first to manage billing.`,
        },
      );
    }

    const session = await this.subscriptionStripeService.createBillingPortalSession(
      {
        customerId: record.stripeCustomerId,
        returnUrl,
      },
    );

    return { url: session.url };
  }

  // Admin-triggered capacity change — the only way `seats` changes once a
  // subscription exists (no more auto-sync to member count).
  async updateSeats({
    workspace,
    seats,
  }: {
    workspace: WorkspaceEntity;
    seats: number;
  }): Promise<WorkspaceSubscriptionEntity> {
    const record = await this.workspaceSubscriptionRepository.findOne({
      where: { workspaceId: workspace.id },
    });

    if (!record?.stripeSubscriptionId) {
      throw new SubscriptionBillingException(
        `Workspace ${workspace.id} has no active subscription`,
        SubscriptionBillingExceptionCode.NO_ACTIVE_PLAN,
        {
          userFriendlyMessage: msg`Subscribe first before changing seats.`,
        },
      );
    }

    const activeMembers = await this.countActiveMembers(workspace.id);

    if (seats < activeMembers) {
      throw new SubscriptionBillingException(
        `Cannot reduce seats below current member count (${activeMembers})`,
        SubscriptionBillingExceptionCode.NO_SEATS_AVAILABLE,
        {
          userFriendlyMessage: msg`You have ${activeMembers} members — remove some before reducing seats below that.`,
        },
      );
    }

    await this.subscriptionStripeService.updateSubscriptionQuantity({
      subscriptionId: record.stripeSubscriptionId,
      quantity: seats,
    });

    await this.workspaceSubscriptionRepository.update(record.id, { seats });

    return { ...record, seats };
  }

  // Cross-tenant reporting for the platform backoffice — every field here
  // comes from `core` schema (workspace + workspaceSubscription + a grouped
  // member count), so this is a handful of cheap queries rather than a
  // fan-out across each tenant's own per-workspace schema.
  async getAllTenantsOverview(): Promise<TenantOverviewDTO[]> {
    const [workspaces, subscriptions, memberCountRows, currentPlan] =
      await Promise.all([
        this.workspaceRepository.find({
          select: { id: true, displayName: true, subdomain: true, createdAt: true },
          order: { createdAt: 'DESC' },
        }),
        this.workspaceSubscriptionRepository.find(),
        this.userWorkspaceRepository
          .createQueryBuilder('userWorkspace')
          .select('userWorkspace.workspaceId', 'workspaceId')
          .addSelect('COUNT(*)', 'count')
          .groupBy('userWorkspace.workspaceId')
          .getRawMany<{ workspaceId: string; count: string }>(),
        this.subscriptionPlanService.getCurrentPlan(),
      ]);

    const subscriptionByWorkspaceId = new Map(
      subscriptions.map((subscription) => [
        subscription.workspaceId,
        subscription,
      ]),
    );
    const memberCountByWorkspaceId = new Map(
      memberCountRows.map((row) => [row.workspaceId, Number(row.count)]),
    );

    return workspaces.map((workspace) => {
      const subscription = subscriptionByWorkspaceId.get(workspace.id);
      const activeMembers = memberCountByWorkspaceId.get(workspace.id) ?? 0;
      const seats = subscription?.seats ?? 0;

      return {
        workspaceId: workspace.id,
        displayName: workspace.displayName ?? null,
        subdomain: workspace.subdomain ?? null,
        createdAt: workspace.createdAt,
        subscriptionStatus: subscription?.status ?? null,
        seats,
        activeMembers,
        trialEnd: subscription?.trialEnd ?? null,
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        isGrandfathered: this.isGrandfathered(workspace),
        estimatedMrrCents: currentPlan ? seats * currentPlan.unitAmountCents : null,
      };
    });
  }
}
