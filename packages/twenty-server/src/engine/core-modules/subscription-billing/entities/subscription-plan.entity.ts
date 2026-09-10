import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

// Admin-configurable, single-active-row pricing: setting a new price deactivates
// the previous row instead of mutating it, so historical prices stay intact.
@Entity({ name: 'subscriptionPlan', schema: 'core' })
@ObjectType('SubscriptionPlan')
export class SubscriptionPlanEntity {
  @Field(() => UUIDScalarType)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => Int)
  @Column({ type: 'integer' })
  unitAmountCents: number;

  @Field()
  @Column({ default: 'usd' })
  currency: string;

  @Field()
  @Column({ default: 'month' })
  interval: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  stripeProductId?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  stripePriceId?: string | null;

  // A once-off Stripe Coupon discounting the first invoice down to
  // FIRST_PERIOD_UNIT_AMOUNT_CENTS — null when unitAmountCents is already at
  // or below that floor, since there's nothing left to discount.
  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  firstPeriodCouponId?: string | null;

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Field(() => Date)
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
