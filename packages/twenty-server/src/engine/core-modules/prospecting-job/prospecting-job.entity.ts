import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PROSPECTING_JOB_DEFAULT_MAX_ATTEMPTS } from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-default-max-attempts.constant';
import { type ProspectingJobPayload } from 'src/engine/core-modules/prospecting-job/types/prospecting-job-payload.type';
import { type ProspectingJobOperation } from 'src/engine/core-modules/prospecting-job/types/prospecting-job-operation.type';
import { type ProspectingJobStatus } from 'src/engine/core-modules/prospecting-job/types/prospecting-job-status.type';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

// The durable unit of prospecting work. Queue messages only carry the row id,
// so a lost or duplicated message never loses or repeats work.
@Entity({ name: 'prospectingJob', schema: 'core' })
@Index(
  'IDX_PROSPECTING_JOB_WORKSPACE_ID_IDEMPOTENCY_KEY_UNIQUE',
  ['workspaceId', 'idempotencyKey'],
  { unique: true },
)
@Index('IDX_PROSPECTING_JOB_WORKSPACE_ID_CAMPAIGN_ID', [
  'workspaceId',
  'campaignId',
])
@Index('IDX_PROSPECTING_JOB_STATUS_NEXT_RUN_AT', ['status', 'nextRunAt'])
export class ProspectingJobEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Workspace schema records cannot be foreign keys from the core schema.
  @Column({ type: 'uuid', nullable: false })
  campaignId: string;

  @Column({ type: 'uuid', nullable: true })
  candidateId: string | null;

  @Column({ type: 'varchar', nullable: false })
  operation: ProspectingJobOperation;

  @Column({ type: 'varchar', nullable: false })
  idempotencyKey: string;

  @Column({ type: 'varchar', nullable: false, default: 'PENDING' })
  status: ProspectingJobStatus;

  @Column({ type: 'integer', nullable: false, default: 0 })
  attempts: number;

  @Column({
    type: 'integer',
    nullable: false,
    default: PROSPECTING_JOB_DEFAULT_MAX_ATTEMPTS,
  })
  maxAttempts: number;

  @Column({ type: 'timestamptz', nullable: false, default: () => 'now()' })
  nextRunAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastEnqueuedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lockedAt: Date | null;

  // Token of the claim that holds the lease; completing or failing requires
  // it, so a run whose lease was reclaimed cannot overwrite the new run.
  @Column({ type: 'varchar', nullable: true })
  lockedBy: string | null;

  @Column({ type: 'jsonb', nullable: false, default: {} })
  input: ProspectingJobPayload;

  @Column({ type: 'jsonb', nullable: true })
  result: ProspectingJobPayload | null;

  @Column({ type: 'varchar', nullable: true })
  lastErrorCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastErrorMessage: string | null;

  @Column({ type: 'varchar', nullable: true })
  correlationId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
