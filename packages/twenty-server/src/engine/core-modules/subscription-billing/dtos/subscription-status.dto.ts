import { Field, Int, ObjectType } from '@nestjs/graphql';

import { WorkspaceSubscriptionStatus } from 'src/engine/core-modules/subscription-billing/enums/workspace-subscription-status.enum';

@ObjectType('WorkspaceSubscriptionStatusPayload')
export class SubscriptionStatusDto {
  @Field(() => WorkspaceSubscriptionStatus)
  status: WorkspaceSubscriptionStatus;

  @Field()
  isLocked: boolean;

  @Field(() => Date, { nullable: true })
  trialEnd: Date | null;

  @Field(() => Date, { nullable: true })
  currentPeriodEnd: Date | null;

  @Field(() => Int)
  seats: number;

  @Field(() => Int)
  activeMembers: number;
}
