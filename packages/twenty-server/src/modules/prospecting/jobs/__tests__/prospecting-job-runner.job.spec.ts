import { type ProspectingJobLedgerService } from 'src/engine/core-modules/prospecting-job/services/prospecting-job-ledger.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { DiscoveryProviderException } from 'src/modules/prospecting/discovery/exceptions/discovery-provider.exception';
import { type DiscoveryPageService } from 'src/modules/prospecting/discovery/services/discovery-page.service';
import { ProspectingJobRunnerJob } from 'src/modules/prospecting/jobs/prospecting-job-runner.job';

const WORKSPACE_ID = '20202020-0000-4000-8000-000000000001';
const CAMPAIGN_ID = '20202020-0000-4000-8000-000000000002';

const CLAIMED_JOB = {
  lockToken: 'lock',
  job: {
    id: 'job-1',
    workspaceId: WORKSPACE_ID,
    campaignId: CAMPAIGN_ID,
    operation: 'DISCOVER_PAGE',
    attempts: 1,
    maxAttempts: 5,
    input: {},
  },
};

describe('ProspectingJobRunnerJob', () => {
  let ledger: Record<
    | 'claimJob'
    | 'completeJob'
    | 'failJob'
    | 'deferClaimedJob'
    | 'cancelClaimedJob',
    jest.Mock
  >;
  let campaignRepository: { findOne: jest.Mock; update: jest.Mock };
  let processPage: jest.Mock;
  let runner: ProspectingJobRunnerJob;

  const run = () =>
    runner.handle({ workspaceId: WORKSPACE_ID, prospectingJobId: 'job-1' });

  const givenCampaignStatus = (status: string | null) =>
    campaignRepository.findOne.mockResolvedValue(
      status === null ? null : { id: CAMPAIGN_ID, status },
    );

  beforeEach(() => {
    ledger = {
      claimJob: jest.fn().mockResolvedValue(CLAIMED_JOB),
      completeJob: jest.fn().mockResolvedValue(true),
      failJob: jest.fn().mockResolvedValue('PENDING'),
      deferClaimedJob: jest.fn().mockResolvedValue(true),
      cancelClaimedJob: jest.fn().mockResolvedValue(true),
    };
    campaignRepository = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    processPage = jest.fn().mockResolvedValue({
      result: { recordCount: 3 },
      followUpJobs: [{ idempotencyKey: 'next' }],
      isCampaignFinished: false,
    });

    runner = new ProspectingJobRunnerJob(
      ledger as unknown as ProspectingJobLedgerService,
      {
        executeInWorkspaceContext: jest.fn((callback: () => unknown) =>
          callback(),
        ),
        getRepository: jest.fn().mockResolvedValue(campaignRepository),
      } as unknown as GlobalWorkspaceOrmManager,
      { processPage } as unknown as DiscoveryPageService,
    );
  });

  it('does nothing when another delivery already claimed the job', async () => {
    ledger.claimJob.mockResolvedValue(null);

    await run();

    expect(processPage).not.toHaveBeenCalled();
  });

  it('runs the page and schedules what comes next', async () => {
    givenCampaignStatus('RUNNING');

    await run();

    expect(ledger.completeJob).toHaveBeenCalledWith({
      claimedJob: CLAIMED_JOB,
      result: { recordCount: 3 },
      followUpJobs: [{ idempotencyKey: 'next' }],
    });
    expect(campaignRepository.update).not.toHaveBeenCalled();
  });

  it('completes the campaign after its last page', async () => {
    givenCampaignStatus('RUNNING');
    processPage.mockResolvedValue({
      result: {},
      followUpJobs: [],
      isCampaignFinished: true,
    });

    await run();

    expect(campaignRepository.update).toHaveBeenCalledWith(
      { id: CAMPAIGN_ID, status: 'RUNNING' },
      { status: 'COMPLETED' },
    );
  });

  it('puts the job on hold while the campaign is paused', async () => {
    givenCampaignStatus('PAUSED');

    await run();

    expect(ledger.deferClaimedJob).toHaveBeenCalledWith(CLAIMED_JOB);
    expect(processPage).not.toHaveBeenCalled();
  });

  it.each(['CANCELLED', 'COMPLETED', null])(
    'cancels the job when the campaign is %s',
    async (status) => {
      givenCampaignStatus(status);

      await run();

      expect(ledger.cancelClaimedJob).toHaveBeenCalledWith(CLAIMED_JOB);
      expect(processPage).not.toHaveBeenCalled();
    },
  );

  it('schedules a retry after a temporary failure', async () => {
    givenCampaignStatus('RUNNING');
    processPage.mockRejectedValue(
      new DiscoveryProviderException('busy', 'PROVIDER_RATE_LIMITED'),
    );

    await run();

    expect(ledger.failJob).toHaveBeenCalledWith({
      claimedJob: CLAIMED_JOB,
      failure: {
        code: 'PROVIDER_RATE_LIMITED',
        message: 'busy',
        isRetryable: true,
      },
    });
    expect(campaignRepository.update).not.toHaveBeenCalled();
  });

  it('fails the campaign when its job can no longer be retried', async () => {
    givenCampaignStatus('RUNNING');
    processPage.mockRejectedValue(new Error('database unavailable'));
    ledger.failJob.mockResolvedValue('DEAD');

    await run();

    expect(campaignRepository.update).toHaveBeenCalledWith(
      { id: CAMPAIGN_ID, status: 'RUNNING' },
      { status: 'FAILED' },
    );
  });
});
