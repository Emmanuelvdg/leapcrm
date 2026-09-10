import { Field, Int, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType('TenantOverview')
export class TenantOverviewDTO {
  @Field(() => UUIDScalarType)
  workspaceId: string;

  @Field(() => String, { nullable: true })
  displayName: string | null;

  @Field(() => String, { nullable: true })
  subdomain: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => String, { nullable: true })
  subscriptionStatus: string | null;

  @Field(() => Int)
  seats: number;

  @Field(() => Int)
  activeMembers: number;

  @Field(() => Date, { nullable: true })
  trialEnd: Date | null;

  @Field(() => Date, { nullable: true })
  currentPeriodEnd: Date | null;

  @Field()
  isGrandfathered: boolean;

  // seats * the current active plan price — an estimate, not the historical
  // price actually billed on this subscription, since only quantity (not
  // price-at-purchase-time) is tracked per workspace.
  @Field(() => Int, { nullable: true })
  estimatedMrrCents: number | null;
}
