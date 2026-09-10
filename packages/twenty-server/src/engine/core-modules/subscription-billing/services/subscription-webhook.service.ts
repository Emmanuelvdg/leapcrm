import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import type Stripe from 'stripe';

import { WorkspaceSubscriptionEntity } from 'src/engine/core-modules/subscription-billing/entities/workspace-subscription.entity';
import { WorkspaceSubscriptionStatus } from 'src/engine/core-modules/subscription-billing/enums/workspace-subscription-status.enum';

const STRIPE_STATUS_MAP: Record<
  Stripe.Subscription.Status,
  WorkspaceSubscriptionStatus
> = {
  trialing: WorkspaceSubscriptionStatus.TRIALING,
  active: WorkspaceSubscriptionStatus.ACTIVE,
  past_due: WorkspaceSubscriptionStatus.PAST_DUE,
  unpaid: WorkspaceSubscriptionStatus.PAST_DUE,
  canceled: WorkspaceSubscriptionStatus.CANCELED,
  incomplete: WorkspaceSubscriptionStatus.INCOMPLETE,
  incomplete_expired: WorkspaceSubscriptionStatus.INCOMPLETE,
  paused: WorkspaceSubscriptionStatus.PAST_DUE,
};

// Every handler here is a last-write-wins mirror of Stripe's own object state
// (no increments, no side-effecting charges) — safe to apply the same event
// twice if Stripe redelivers it.
@Injectable()
export class SubscriptionWebhookService {
  private readonly logger = new Logger(SubscriptionWebhookService.name);

  constructor(
    @InjectRepository(WorkspaceSubscriptionEntity)
    private readonly workspaceSubscriptionRepository: Repository<WorkspaceSubscriptionEntity>,
  ) {}

  async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;
      default:
        this.logger.debug(`Ignoring unhandled Stripe event: ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const workspaceId = session.metadata?.workspaceId;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;

    if (!workspaceId || !subscriptionId) {
      this.logger.warn(
        'checkout.session.completed missing workspaceId or subscription id',
      );

      return;
    }

    await this.upsert(workspaceId, {
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId ?? undefined,
    });
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const workspaceId = subscription.metadata?.workspaceId;

    if (!workspaceId) {
      this.logger.warn('customer.subscription event missing workspaceId');

      return;
    }

    const item = subscription.items.data[0];
    const currentPeriodEndSeconds = item?.current_period_end;

    await this.upsert(workspaceId, {
      stripeSubscriptionId: subscription.id,
      status: STRIPE_STATUS_MAP[subscription.status],
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      currentPeriodEnd: currentPeriodEndSeconds
        ? new Date(currentPeriodEndSeconds * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      // Stripe's own item quantity is authoritative once a subscription
      // exists — the source of truth after checkout or an admin-triggered
      // seat change.
      ...(item ? { seats: item.quantity ?? 0 } : {}),
    });
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const workspaceId = subscription.metadata?.workspaceId;

    if (!workspaceId) {
      return;
    }

    await this.upsert(workspaceId, {
      status: WorkspaceSubscriptionStatus.CANCELED,
    });
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const subscription =
      invoice.parent?.subscription_details?.subscription;
    const subscriptionId =
      typeof subscription === 'string' ? subscription : subscription?.id;

    if (!subscriptionId) {
      return;
    }

    await this.workspaceSubscriptionRepository.update(
      { stripeSubscriptionId: subscriptionId },
      { status: WorkspaceSubscriptionStatus.PAST_DUE },
    );
  }

  private async upsert(
    workspaceId: string,
    changes: Partial<
      Pick<
        WorkspaceSubscriptionEntity,
        | 'stripeSubscriptionId'
        | 'stripeCustomerId'
        | 'status'
        | 'trialEnd'
        | 'currentPeriodEnd'
        | 'cancelAtPeriodEnd'
        | 'seats'
      >
    >,
  ): Promise<void> {
    const existing = await this.workspaceSubscriptionRepository.findOne({
      where: { workspaceId },
    });

    if (existing) {
      await this.workspaceSubscriptionRepository.update(existing.id, changes);

      return;
    }

    await this.workspaceSubscriptionRepository.save(
      this.workspaceSubscriptionRepository.create({
        workspaceId,
        status: WorkspaceSubscriptionStatus.TRIALING,
        seats: 0,
        ...changes,
      }),
    );
  }
}
