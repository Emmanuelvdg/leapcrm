import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SubscriptionWebhookController } from 'src/engine/core-modules/subscription-billing/controllers/subscription-webhook.controller';
import { WorkspaceDomainsModule } from 'src/engine/core-modules/domain/workspace-domains/workspace-domains.module';
import { SubscriptionPlanEntity } from 'src/engine/core-modules/subscription-billing/entities/subscription-plan.entity';
import { WorkspaceSubscriptionEntity } from 'src/engine/core-modules/subscription-billing/entities/workspace-subscription.entity';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { SubscriptionPlanService } from 'src/engine/core-modules/subscription-billing/services/subscription-plan.service';
import { SubscriptionStripeService } from 'src/engine/core-modules/subscription-billing/services/subscription-stripe.service';
import { SubscriptionWebhookService } from 'src/engine/core-modules/subscription-billing/services/subscription-webhook.service';
import { WorkspaceSubscriptionService } from 'src/engine/core-modules/subscription-billing/services/workspace-subscription.service';
import { SubscriptionAdminResolver } from 'src/engine/core-modules/subscription-billing/subscription-admin.resolver';
import { SubscriptionResolver } from 'src/engine/core-modules/subscription-billing/subscription.resolver';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionPlanEntity,
      WorkspaceSubscriptionEntity,
      UserWorkspaceEntity,
      WorkspaceEntity,
    ]),
    PermissionsModule,
    WorkspaceDomainsModule,
  ],
  providers: [
    SubscriptionStripeService,
    SubscriptionPlanService,
    WorkspaceSubscriptionService,
    SubscriptionWebhookService,
    SubscriptionResolver,
    SubscriptionAdminResolver,
  ],
  controllers: [SubscriptionWebhookController],
  exports: [
    SubscriptionPlanService,
    WorkspaceSubscriptionService,
    TypeOrmModule,
  ],
})
export class SubscriptionBillingModule {}
