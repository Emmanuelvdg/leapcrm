import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { randomUUID } from 'crypto';

import { type EntityManager, Repository } from 'typeorm';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { PROSPECTING_JOB_CLAIM_CLOCK_TOLERANCE_MS } from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-claim-clock-tolerance-ms.constant';
import { PROSPECTING_JOB_DEFAULT_MAX_ATTEMPTS } from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-default-max-attempts.constant';
import { PROSPECTING_JOB_ERROR_MESSAGE_MAX_LENGTH } from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-error-message-max-length.constant';
import { PROSPECTING_JOB_LEASE_DURATION_MS } from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-lease-duration-ms.constant';
import { PROSPECTING_JOB_MAX_RUNNING_PER_WORKSPACE } from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-max-running-per-workspace.constant';
import { PROSPECTING_JOB_RECONCILE_BATCH_SIZE } from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-reconcile-batch-size.constant';
import { PROSPECTING_JOB_REENQUEUE_AFTER_MS } from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-reenqueue-after-ms.constant';
import { PROSPECTING_JOB_RUNNER_JOB_NAME } from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-runner-job-name.constant';
import { ProspectingJobEntity } from 'src/engine/core-modules/prospecting-job/prospecting-job.entity';
import { type CreateProspectingJobInput } from 'src/engine/core-modules/prospecting-job/types/create-prospecting-job-input.type';
import { type ProspectingJobFailure } from 'src/engine/core-modules/prospecting-job/types/prospecting-job-failure.type';
import { type ProspectingJobPayload } from 'src/engine/core-modules/prospecting-job/types/prospecting-job-payload.type';
import { type ProspectingJobRunnerJobData } from 'src/engine/core-modules/prospecting-job/types/prospecting-job-runner-job-data.type';
import { computeProspectingJobRetry } from 'src/engine/core-modules/prospecting-job/utils/compute-prospecting-job-retry.util';

type EnqueueableProspectingJob = Pick<
  ProspectingJobEntity,
  'id' | 'workspaceId' | 'nextRunAt'
>;

export type ClaimedProspectingJob = {
  job: ProspectingJobEntity;
  lockToken: string;
};

export type ProspectingJobReconcileResult = {
  requeuedExpiredLeaseCount: number;
  deadExpiredLeaseCount: number;
  reenqueuedPendingCount: number;
};

@Injectable()
export class ProspectingJobLedgerService {
  private readonly logger = new Logger(ProspectingJobLedgerService.name);

  constructor(
    // The reconciler sweeps every workspace's jobs; per-job methods filter on
    // workspaceId explicitly.
    // eslint-disable-next-line twenty/prefer-workspace-scoped-repository
    @InjectRepository(ProspectingJobEntity)
    private readonly prospectingJobRepository: Repository<ProspectingJobEntity>,
    @InjectMessageQueue(MessageQueue.prospectingQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  // Returns only the jobs that did not already exist for their idempotency key.
  async createJobs(
    inputs: CreateProspectingJobInput[],
  ): Promise<ProspectingJobEntity[]> {
    const insertedJobs = await this.insertJobs(
      this.prospectingJobRepository.manager,
      inputs,
    );

    await this.enqueueJobs(insertedJobs);

    return insertedJobs;
  }

  async claimJob({
    workspaceId,
    prospectingJobId,
  }: {
    workspaceId: string;
    prospectingJobId: string;
  }): Promise<ClaimedProspectingJob | null> {
    const lockToken = randomUUID();

    const updateResult = await this.prospectingJobRepository
      .createQueryBuilder()
      .update(ProspectingJobEntity)
      .set({
        status: 'RUNNING',
        attempts: () => '"attempts" + 1',
        lockedAt: () => 'now()',
        lockedBy: lockToken,
      })
      .where('"id" = :prospectingJobId', { prospectingJobId })
      .andWhere('"workspaceId" = :workspaceId', { workspaceId })
      .andWhere(`"status" = 'PENDING'`)
      .andWhere(
        `"nextRunAt" <= now() + (:clockToleranceMs * interval '1 millisecond')`,
        { clockToleranceMs: PROSPECTING_JOB_CLAIM_CLOCK_TOLERANCE_MS },
      )
      .andWhere(
        `(SELECT count(*) FROM "core"."prospectingJob" "runningJob"
           WHERE "runningJob"."workspaceId" = :workspaceId
             AND "runningJob"."status" = 'RUNNING') < :maxRunningPerWorkspace`,
        { maxRunningPerWorkspace: PROSPECTING_JOB_MAX_RUNNING_PER_WORKSPACE },
      )
      .returning('*')
      .execute();

    const [claimedJob] = updateResult.raw as ProspectingJobEntity[];

    if (!claimedJob) {
      return null;
    }

    return { job: claimedJob, lockToken };
  }

  // Follow-up jobs are inserted in the same transaction so a crash can never
  // mark a page done without scheduling the next one. Returns false when the
  // lease was lost (reclaimed or cancelled), in which case nothing is written.
  async completeJob({
    claimedJob,
    result,
    followUpJobs = [],
  }: {
    claimedJob: ClaimedProspectingJob;
    result: ProspectingJobPayload;
    followUpJobs?: CreateProspectingJobInput[];
  }): Promise<boolean> {
    const insertedFollowUpJobs =
      await this.prospectingJobRepository.manager.transaction(
        async (entityManager) => {
          const updateResult = await entityManager
            .createQueryBuilder()
            .update(ProspectingJobEntity)
            .set({
              status: 'SUCCEEDED',
              result,
              lockedAt: null,
              lockedBy: null,
              lastErrorCode: null,
              lastErrorMessage: null,
            })
            .where(this.buildLeaseHolderCondition(), {
              prospectingJobId: claimedJob.job.id,
              workspaceId: claimedJob.job.workspaceId,
              lockToken: claimedJob.lockToken,
            })
            .execute();

          if (updateResult.affected !== 1) {
            return null;
          }

          return this.insertJobs(entityManager, followUpJobs);
        },
      );

    if (insertedFollowUpJobs === null) {
      return false;
    }

    await this.enqueueJobs(insertedFollowUpJobs);

    return true;
  }

  async failJob({
    claimedJob,
    failure,
  }: {
    claimedJob: ClaimedProspectingJob;
    failure: ProspectingJobFailure;
  }): Promise<boolean> {
    const retryDecision = computeProspectingJobRetry({
      attempts: claimedJob.job.attempts,
      maxAttempts: claimedJob.job.maxAttempts,
      isRetryable: failure.isRetryable,
      now: new Date(),
    });

    const nextRunAt =
      retryDecision.status === 'PENDING' ? retryDecision.nextRunAt : undefined;

    const updateResult = await this.prospectingJobRepository
      .createQueryBuilder()
      .update(ProspectingJobEntity)
      .set({
        status: retryDecision.status,
        lockedAt: null,
        lockedBy: null,
        lastErrorCode: failure.code,
        lastErrorMessage: failure.message.slice(
          0,
          PROSPECTING_JOB_ERROR_MESSAGE_MAX_LENGTH,
        ),
        ...(nextRunAt ? { nextRunAt, lastEnqueuedAt: () => 'now()' } : {}),
      })
      .where(this.buildLeaseHolderCondition(), {
        prospectingJobId: claimedJob.job.id,
        workspaceId: claimedJob.job.workspaceId,
        lockToken: claimedJob.lockToken,
      })
      .execute();

    if (updateResult.affected !== 1) {
      return false;
    }

    if (nextRunAt) {
      await this.enqueueJobs([
        {
          id: claimedJob.job.id,
          workspaceId: claimedJob.job.workspaceId,
          nextRunAt,
        },
      ]);
    }

    return true;
  }

  // Running jobs are cancelled too: their lease token no longer matches a
  // RUNNING row, so the in-flight run can neither complete nor schedule
  // follow-ups.
  async cancelCampaignJobs({
    workspaceId,
    campaignId,
  }: {
    workspaceId: string;
    campaignId: string;
  }): Promise<number> {
    const updateResult = await this.prospectingJobRepository
      .createQueryBuilder()
      .update(ProspectingJobEntity)
      .set({ status: 'CANCELLED', lockedAt: null, lockedBy: null })
      .where('"workspaceId" = :workspaceId', { workspaceId })
      .andWhere('"campaignId" = :campaignId', { campaignId })
      .andWhere(`"status" IN ('PENDING', 'RUNNING')`)
      .execute();

    return updateResult.affected ?? 0;
  }

  async reconcile(): Promise<ProspectingJobReconcileResult> {
    const expiredLeaseUpdateResult = await this.prospectingJobRepository
      .createQueryBuilder()
      .update(ProspectingJobEntity)
      .set({
        status: () =>
          `CASE WHEN "attempts" >= "maxAttempts" THEN 'DEAD' ELSE 'PENDING' END`,
        lockedAt: null,
        lockedBy: null,
        nextRunAt: () => 'now()',
        lastEnqueuedAt: () => 'now()',
        lastErrorCode: 'LEASE_EXPIRED',
        lastErrorMessage: null,
      })
      .where(
        `"id" IN (
          SELECT "id" FROM "core"."prospectingJob"
          WHERE "status" = 'RUNNING'
            AND "lockedAt" < now() - (:leaseDurationMs * interval '1 millisecond')
          LIMIT :batchSize
          FOR UPDATE SKIP LOCKED
        )`,
        {
          leaseDurationMs: PROSPECTING_JOB_LEASE_DURATION_MS,
          batchSize: PROSPECTING_JOB_RECONCILE_BATCH_SIZE,
        },
      )
      .returning(['id', 'workspaceId', 'nextRunAt', 'status'])
      .execute();

    const expiredLeaseJobs = expiredLeaseUpdateResult.raw as Pick<
      ProspectingJobEntity,
      'id' | 'workspaceId' | 'nextRunAt' | 'status'
    >[];

    const requeuedExpiredLeaseJobs = expiredLeaseJobs.filter(
      (job) => job.status === 'PENDING',
    );

    const pendingUpdateResult = await this.prospectingJobRepository
      .createQueryBuilder()
      .update(ProspectingJobEntity)
      .set({ lastEnqueuedAt: () => 'now()' })
      .where(
        `"id" IN (
          SELECT "id" FROM "core"."prospectingJob"
          WHERE "status" = 'PENDING'
            AND GREATEST("lastEnqueuedAt", "nextRunAt")
              < now() - (:reenqueueAfterMs * interval '1 millisecond')
          ORDER BY "nextRunAt"
          LIMIT :batchSize
          FOR UPDATE SKIP LOCKED
        )`,
        {
          reenqueueAfterMs: PROSPECTING_JOB_REENQUEUE_AFTER_MS,
          batchSize: PROSPECTING_JOB_RECONCILE_BATCH_SIZE,
        },
      )
      .returning(['id', 'workspaceId', 'nextRunAt'])
      .execute();

    const stalePendingJobs =
      pendingUpdateResult.raw as EnqueueableProspectingJob[];

    await this.enqueueJobs([...requeuedExpiredLeaseJobs, ...stalePendingJobs]);

    return {
      requeuedExpiredLeaseCount: requeuedExpiredLeaseJobs.length,
      deadExpiredLeaseCount:
        expiredLeaseJobs.length - requeuedExpiredLeaseJobs.length,
      reenqueuedPendingCount: stalePendingJobs.length,
    };
  }

  private async insertJobs(
    entityManager: EntityManager,
    inputs: CreateProspectingJobInput[],
  ): Promise<ProspectingJobEntity[]> {
    if (inputs.length === 0) {
      return [];
    }

    const insertResult = await entityManager
      .createQueryBuilder()
      .insert()
      .into(ProspectingJobEntity)
      .values(
        inputs.map((input) => ({
          workspaceId: input.workspaceId,
          campaignId: input.campaignId,
          candidateId: input.candidateId ?? null,
          operation: input.operation,
          idempotencyKey: input.idempotencyKey,
          input: input.input ?? {},
          maxAttempts:
            input.maxAttempts ?? PROSPECTING_JOB_DEFAULT_MAX_ATTEMPTS,
          correlationId: input.correlationId ?? null,
          nextRunAt: input.runAt ?? (() => 'now()'),
          lastEnqueuedAt: () => 'now()',
        })),
      )
      .orIgnore()
      .returning('*')
      .execute();

    return insertResult.raw as ProspectingJobEntity[];
  }

  // A failed enqueue is logged, not thrown: the row is already committed and
  // the reconciler enqueues it again once it is overdue.
  private async enqueueJobs(jobs: EnqueueableProspectingJob[]): Promise<void> {
    await Promise.all(
      jobs.map(async (job) => {
        try {
          await this.messageQueueService.add<ProspectingJobRunnerJobData>(
            PROSPECTING_JOB_RUNNER_JOB_NAME,
            { workspaceId: job.workspaceId, prospectingJobId: job.id },
            {
              delay: Math.max(
                new Date(job.nextRunAt).getTime() - Date.now(),
                0,
              ),
            },
          );
        } catch (error) {
          this.logger.warn(
            `Could not enqueue prospecting job ${job.id}, the reconciler will retry: ${error}`,
          );
        }
      }),
    );
  }

  private buildLeaseHolderCondition(): string {
    return `"id" = :prospectingJobId AND "workspaceId" = :workspaceId AND "status" = 'RUNNING' AND "lockedBy" = :lockToken`;
  }
}
