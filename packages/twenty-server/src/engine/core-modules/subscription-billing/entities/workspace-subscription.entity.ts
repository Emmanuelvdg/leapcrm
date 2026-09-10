import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { WorkspaceSubscriptionStatus } from 'src/engine/core-modules/subscription-billing/enums/workspace-subscription-status.enum';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

@Index('IDX_WORKSPACE_SUBSCRIPTION_WORKSPACE_ID', ['workspaceId'], {
  unique: true,
})
@Entity({ name: 'workspaceSubscription', schema: 'core' })
@ObjectType('WorkspaceSubscription')
export class WorkspaceSubscriptionEntity extends WorkspaceRelatedEntity {
  @Field(() => UUIDScalarType)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  stripeCustomerId?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  stripeSubscriptionId?: string | null;

  @Field(() => WorkspaceSubscriptionStatus)
  @Column({
    type: 'enum',
    enumName: 'workspaceSubscription_status_enum',
    enum: WorkspaceSubscriptionStatus,
    default: WorkspaceSubscriptionStatus.TRIALING,
  })
  status: WorkspaceSubscriptionStatus;

  @Field(() => Int)
  @Column({ type: 'integer', default: 0 })
  seats: number;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  trialEnd?: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodEnd?: Date | null;

  @Field()
  @Column({ default: false })
  cancelAtPeriodEnd: boolean;

  @Field(() => Date)
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
