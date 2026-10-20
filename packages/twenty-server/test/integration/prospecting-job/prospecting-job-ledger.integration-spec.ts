import crypto from 'crypto';

import { config } from 'dotenv';
import { isDefined } from 'twenty-shared/utils';
import { DataSource, type Repository } from 'typeorm';

import { type MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { PROSPECTING_JOB_LEASE_DURATION_MS } from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-lease-duration-ms.constant';
import { PROSPECTING_JOB_REENQUEUE_AFTER_MS } from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-reenqueue-after-ms.constant';
import { ProspectingJobEntity } from 'src/engine/core-modules/prospecting-job/prospecting-job.entity';
import { ProspectingJobLedgerService } from 'src/engine/core-modules/prospecting-job/services/prospecting-job-ledger.service';
import { type CreateProspectingJobInput } from 'src/engine/core-modules/prospecting-job/types/create-prospecting-job-input.type';

jest.useRealTimers();

config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  override: true,
});

describe('ProspectingJobLedgerService (integration)', () => {
  let dataSource: DataSource;
  let prospectingJobRepository: Repository<ProspectingJobEntity>;
  let ledgerService: ProspectingJobLedgerService;
  let enqueue: jest.Mock;
  let workspaceId: string;
  let campaignId: string;

  const buildJobInput = (
    overrides: Partial<CreateProspectingJobInput> = {},
  ): CreateProspectingJobInput => ({
    workspaceId,
    campaignId,
    operation: 'DISCOVER_PAGE',
    idempotencyKey: `${campaignId}:DISCOVER_PAGE:fixture:${crypto.randomUUID()}:1`,
    input: { page: 1 },
    ...overrides,
  });

  const createSingleJob = async (
    overrides: Partial<CreateProspectingJobInput> = {},
  ): Promise<ProspectingJobEntity> => {
    const [job] = await ledgerService.createJobs([buildJobInput(overrides)]);

    return job;
  };

  const expireLease = (prospectingJobId: string) =>
    dataSource.query(
      `UPDATE "core"."prospectingJob" SET "lockedAt" = now() - ($1 * interval '1 millisecond') WHERE "id" = $2`,
      [PROSPECTING_JOB_LEASE_DURATION_MS + 60_000, prospectingJobId],
    );

  const findJob = (prospectingJobId: string) =>
    prospectingJobRepository.findOneByOrFail({ id: prospectingJobId });

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.PG_DATABASE_URL,
      schema: 'core',
      entities: [
        'src/engine/core-modules/**/*.entity.ts',
        'src/engine/metadata-modules/**/*.entity.ts',
      ],
      synchronize: false,
    });
    await dataSource.initialize();

    prospectingJobRepository = dataSource.getRepository(ProspectingJobEntity);

    const [seedWorkspace] = await dataSource.query(
      `SELECT id FROM "core"."workspace" ORDER BY "createdAt" LIMIT 1`,
    );

    if (!isDefined(seedWorkspace)) {
      throw new Error(
        'No seeded workspace found; run database:reset before the integration suite.',
      );
    }

    workspaceId = seedWorkspace.id as string;
  });

  beforeEach(() => {
    campaignId = crypto.randomUUID();
    enqueue = jest.fn().mockResolvedValue(undefined);
    ledgerService = new ProspectingJobLedgerService(prospectingJobRepository, {
      add: enqueue,
    } as unknown as MessageQueueService);
  });

  afterEach(async () => {
    await dataSource.query(
      `DELETE FROM "core"."prospectingJob" WHERE "workspaceId" = $1 AND "campaignId" = $2`,
      [workspaceId, campaignId],
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('creates one row and one queue message for a repeated idempotency key', async () => {
    const jobInput = buildJobInput();

    const firstInsert = await ledgerService.createJobs([jobInput]);
    const secondInsert = await ledgerService.createJobs([jobInput]);

    const rowCount = await prospectingJobRepository.countBy({
      workspaceId,
      campaignId,
    });

    expect(firstInsert).toHaveLength(1);
    expect(secondInsert).toHaveLength(0);
    expect(rowCount).toBe(1);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0][1]).toEqual({
      workspaceId,
      prospectingJobId: firstInsert[0].id,
    });
  });

  it('lets exactly one of several concurrent claims run the job', async () => {
    const job = await createSingleJob();

    const claims = await Promise.all(
      Array.from({ length: 5 }, () =>
        ledgerService.claimJob({ workspaceId, prospectingJobId: job.id }),
      ),
    );

    const successfulClaims = claims.filter(isDefined);
    const storedJob = await findJob(job.id);

    expect(successfulClaims).toHaveLength(1);
    expect(storedJob.status).toBe('RUNNING');
    expect(storedJob.attempts).toBe(1);
  });

  it('does not let another workspace claim the job', async () => {
    const job = await createSingleJob();

    const claim = await ledgerService.claimJob({
      workspaceId: crypto.randomUUID(),
      prospectingJobId: job.id,
    });

    expect(claim).toBeNull();
    expect((await findJob(job.id)).status).toBe('PENDING');
  });

  it('completes a job and schedules its follow-up in the same step', async () => {
    const job = await createSingleJob();
    const claimedJob = await ledgerService.claimJob({
      workspaceId,
      prospectingJobId: job.id,
    });

    if (!isDefined(claimedJob)) {
      throw new Error('Expected the job to be claimed');
    }

    const isCompleted = await ledgerService.completeJob({
      claimedJob,
      result: { recordCount: 10 },
      followUpJobs: [buildJobInput({ input: { page: 2 } })],
    });

    const jobs = await prospectingJobRepository.findBy({
      workspaceId,
      campaignId,
    });

    expect(isCompleted).toBe(true);
    expect(jobs.map((storedJob) => storedJob.status).sort()).toEqual([
      'PENDING',
      'SUCCEEDED',
    ]);
    expect(enqueue).toHaveBeenCalledTimes(2);
  });

  it('retries a crashed run once its lease expires and rejects the stale runner', async () => {
    const job = await createSingleJob();
    const crashedClaim = await ledgerService.claimJob({
      workspaceId,
      prospectingJobId: job.id,
    });

    if (!isDefined(crashedClaim)) {
      throw new Error('Expected the job to be claimed');
    }

    await expireLease(job.id);

    const reconcileResult = await ledgerService.reconcile();
    const requeuedJob = await findJob(job.id);

    expect(reconcileResult.requeuedExpiredLeaseCount).toBeGreaterThanOrEqual(1);
    expect(requeuedJob.status).toBe('PENDING');
    expect(requeuedJob.lastErrorCode).toBe('LEASE_EXPIRED');

    const secondClaim = await ledgerService.claimJob({
      workspaceId,
      prospectingJobId: job.id,
    });

    expect(secondClaim?.job.attempts).toBe(2);

    const isStaleRunnerCompleted = await ledgerService.completeJob({
      claimedJob: crashedClaim,
      result: {},
      followUpJobs: [buildJobInput()],
    });

    expect(isStaleRunnerCompleted).toBe(false);
    expect(
      await prospectingJobRepository.countBy({ workspaceId, campaignId }),
    ).toBe(1);
  });

  it('marks a job dead when its lease expires on the last attempt', async () => {
    const job = await createSingleJob({ maxAttempts: 1 });

    await ledgerService.claimJob({ workspaceId, prospectingJobId: job.id });
    await expireLease(job.id);
    await ledgerService.reconcile();

    expect((await findJob(job.id)).status).toBe('DEAD');
  });

  it('schedules a retry with backoff after a retryable failure', async () => {
    const job = await createSingleJob();
    const claimedJob = await ledgerService.claimJob({
      workspaceId,
      prospectingJobId: job.id,
    });

    if (!isDefined(claimedJob)) {
      throw new Error('Expected the job to be claimed');
    }

    const failedStatus = await ledgerService.failJob({
      claimedJob,
      failure: {
        code: 'PROVIDER_TIMEOUT',
        message: 'Provider timed out',
        isRetryable: true,
      },
    });

    const storedJob = await findJob(job.id);

    expect(failedStatus).toBe('PENDING');
    expect(storedJob.status).toBe('PENDING');
    expect(storedJob.lastErrorCode).toBe('PROVIDER_TIMEOUT');
    expect(storedJob.nextRunAt.getTime()).toBeGreaterThan(Date.now());
    expect(enqueue.mock.calls[1][2].delay).toBeGreaterThan(0);
  });

  it('cancels pending and running jobs of a campaign and blocks their follow-ups', async () => {
    const runningJob = await createSingleJob();
    const pendingJob = await createSingleJob();
    const claimedJob = await ledgerService.claimJob({
      workspaceId,
      prospectingJobId: runningJob.id,
    });

    if (!isDefined(claimedJob)) {
      throw new Error('Expected the job to be claimed');
    }

    const cancelledCount = await ledgerService.cancelCampaignJobs({
      workspaceId,
      campaignId,
    });

    const isCompleted = await ledgerService.completeJob({
      claimedJob,
      result: {},
      followUpJobs: [buildJobInput()],
    });

    expect(cancelledCount).toBe(2);
    expect(isCompleted).toBe(false);
    expect((await findJob(runningJob.id)).status).toBe('CANCELLED');
    expect((await findJob(pendingJob.id)).status).toBe('CANCELLED');
    expect(
      await prospectingJobRepository.countBy({ workspaceId, campaignId }),
    ).toBe(2);
  });

  it('re-enqueues a pending job whose queue message was lost', async () => {
    const job = await createSingleJob();

    await dataSource.query(
      `UPDATE "core"."prospectingJob"
          SET "lastEnqueuedAt" = now() - ($1 * interval '1 millisecond'),
              "nextRunAt" = now() - ($1 * interval '1 millisecond')
        WHERE "id" = $2`,
      [PROSPECTING_JOB_REENQUEUE_AFTER_MS + 60_000, job.id],
    );
    enqueue.mockClear();

    await ledgerService.reconcile();

    expect(enqueue).toHaveBeenCalledWith(
      expect.any(String),
      { workspaceId, prospectingJobId: job.id },
      expect.any(Object),
    );
  });

  it('keeps held jobs out of claims and reconciliation until released', async () => {
    const job = await createSingleJob();

    const heldCount = await ledgerService.holdCampaignJobs({
      workspaceId,
      campaignId,
    });

    await dataSource.query(
      `UPDATE "core"."prospectingJob"
          SET "lastEnqueuedAt" = now() - ($1 * interval '1 millisecond')
        WHERE "id" = $2`,
      [PROSPECTING_JOB_REENQUEUE_AFTER_MS + 60_000, job.id],
    );
    enqueue.mockClear();

    const claimWhileHeld = await ledgerService.claimJob({
      workspaceId,
      prospectingJobId: job.id,
    });

    await ledgerService.reconcile();

    expect(heldCount).toBe(1);
    expect(claimWhileHeld).toBeNull();
    expect(enqueue).not.toHaveBeenCalledWith(
      expect.any(String),
      { workspaceId, prospectingJobId: job.id },
      expect.any(Object),
    );

    const releasedCount = await ledgerService.releaseCampaignJobs({
      workspaceId,
      campaignId,
    });
    const claimAfterRelease = await ledgerService.claimJob({
      workspaceId,
      prospectingJobId: job.id,
    });

    expect(releasedCount).toBe(1);
    expect(enqueue).toHaveBeenCalledWith(
      expect.any(String),
      { workspaceId, prospectingJobId: job.id },
      expect.any(Object),
    );
    expect(claimAfterRelease).not.toBeNull();
  });

  it('holds a claimed job of a paused campaign without using an attempt', async () => {
    const job = await createSingleJob();
    const claimedJob = await ledgerService.claimJob({
      workspaceId,
      prospectingJobId: job.id,
    });

    if (!isDefined(claimedJob)) {
      throw new Error('Expected the job to be claimed');
    }

    await ledgerService.deferClaimedJob(claimedJob);

    const heldJob = await findJob(job.id);
    const claimWhileHeld = await ledgerService.claimJob({
      workspaceId,
      prospectingJobId: job.id,
    });

    expect(heldJob.status).toBe('PENDING');
    expect(heldJob.attempts).toBe(0);
    expect(claimWhileHeld).toBeNull();

    await ledgerService.releaseCampaignJobs({ workspaceId, campaignId });

    const claimAfterRelease = await ledgerService.claimJob({
      workspaceId,
      prospectingJobId: job.id,
    });

    expect(claimAfterRelease?.job.attempts).toBe(1);
  });

  it('cancels a claimed job so its runner can no longer complete it', async () => {
    const job = await createSingleJob();
    const claimedJob = await ledgerService.claimJob({
      workspaceId,
      prospectingJobId: job.id,
    });

    if (!isDefined(claimedJob)) {
      throw new Error('Expected the job to be claimed');
    }

    await ledgerService.cancelClaimedJob(claimedJob);

    const isCompleted = await ledgerService.completeJob({
      claimedJob,
      result: {},
    });

    expect((await findJob(job.id)).status).toBe('CANCELLED');
    expect(isCompleted).toBe(false);
  });
});
