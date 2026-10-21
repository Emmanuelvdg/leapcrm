import { Logger } from '@nestjs/common';

import { assertUnreachable, isDefined } from 'twenty-shared/utils';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { PROSPECTING_JOB_RUNNER_JOB_NAME } from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-runner-job-name.constant';
import {
  type ClaimedProspectingJob,
  ProspectingJobLedgerService,
} from 'src/engine/core-modules/prospecting-job/services/prospecting-job-ledger.service';
import { type ProspectingJobRunnerJobData } from 'src/engine/core-modules/prospecting-job/types/prospecting-job-runner-job-data.type';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  DiscoveryPageService,
  type DiscoveryPageOutcome,
} from 'src/modules/prospecting/discovery/services/discovery-page.service';
import { ProspectingCampaignWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospecting-campaign.workspace-entity';
import { buildCampaignStatusChangeCriteria } from 'src/modules/prospecting/utils/build-campaign-status-change-criteria.util';
import { toProspectingJobFailure } from 'src/modules/prospecting/utils/to-prospecting-job-failure.util';

// Queue messages only point at a ledger row; the claim decides whether this
// delivery runs, so duplicate or late deliveries do nothing.
@Processor(MessageQueue.prospectingQueue)
export class ProspectingJobRunnerJob {
  private readonly logger = new Logger(ProspectingJobRunnerJob.name);

  constructor(
    private readonly prospectingJobLedgerService: ProspectingJobLedgerService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly discoveryPageService: DiscoveryPageService,
  ) {}

  @Process(PROSPECTING_JOB_RUNNER_JOB_NAME)
  async handle({
    workspaceId,
    prospectingJobId,
  }: ProspectingJobRunnerJobData): Promise<void> {
    const claimedJob = await this.prospectingJobLedgerService.claimJob({
      workspaceId,
      prospectingJobId,
    });

    if (!isDefined(claimedJob)) {
      return;
    }

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      try {
        await this.runClaimedJob({ workspaceId, claimedJob });
      } catch (error) {
        const failedStatus = await this.prospectingJobLedgerService.failJob({
          claimedJob,
          failure: toProspectingJobFailure(error),
        });

        // The campaign is one chain of jobs: once a link can no longer be
        // retried, nothing will move the campaign forward.
        if (failedStatus === 'DEAD' || failedStatus === 'FAILED') {
          this.logger.error(
            `Prospecting job ${claimedJob.job.id} stopped for campaign ${claimedJob.job.campaignId}: ${error}`,
          );

          await this.finishCampaign({
            workspaceId,
            campaignId: claimedJob.job.campaignId,
            status: 'FAILED',
          });
        }
      }
    }, buildSystemAuthContext(workspaceId));
  }

  private async runClaimedJob({
    workspaceId,
    claimedJob,
  }: {
    workspaceId: string;
    claimedJob: ClaimedProspectingJob;
  }): Promise<void> {
    const campaignRepository = await this.getCampaignRepository(workspaceId);
    const campaign = await campaignRepository.findOne({
      where: { id: claimedJob.job.campaignId },
    });

    if (!isDefined(campaign)) {
      await this.prospectingJobLedgerService.cancelClaimedJob(claimedJob);

      return;
    }

    if (campaign.status === 'PAUSED') {
      await this.prospectingJobLedgerService.deferClaimedJob(claimedJob);

      return;
    }

    if (campaign.status !== 'RUNNING') {
      await this.prospectingJobLedgerService.cancelClaimedJob(claimedJob);

      return;
    }

    const outcome = await this.runOperation({
      workspaceId,
      campaign,
      claimedJob,
    });

    const isCompleted = await this.prospectingJobLedgerService.completeJob({
      claimedJob,
      result: outcome.result,
      followUpJobs: outcome.followUpJobs,
    });

    if (isCompleted && outcome.isCampaignFinished) {
      await this.finishCampaign({
        workspaceId,
        campaignId: campaign.id,
        status: 'COMPLETED',
      });
    }
  }

  private async runOperation({
    workspaceId,
    campaign,
    claimedJob,
  }: {
    workspaceId: string;
    campaign: ProspectingCampaignWorkspaceEntity;
    claimedJob: ClaimedProspectingJob;
  }): Promise<DiscoveryPageOutcome> {
    const { operation } = claimedJob.job;

    switch (operation) {
      case 'DISCOVER_PAGE':
        return this.discoveryPageService.processPage({
          workspaceId,
          campaign,
          claimedJob,
        });
      default:
        return assertUnreachable(operation);
    }
  }

  // Conditional on RUNNING so a campaign paused or cancelled meanwhile keeps
  // the status the user gave it.
  private async finishCampaign({
    workspaceId,
    campaignId,
    status,
  }: {
    workspaceId: string;
    campaignId: string;
    status: 'COMPLETED' | 'FAILED';
  }): Promise<void> {
    const campaignRepository = await this.getCampaignRepository(workspaceId);

    await campaignRepository.update(
      {
        id: campaignId,
        status: buildCampaignStatusChangeCriteria({
          fromStatus: 'RUNNING',
          toStatus: status,
        }),
      },
      { status },
    );
  }

  private getCampaignRepository(workspaceId: string) {
    return this.globalWorkspaceOrmManager.getRepository(
      workspaceId,
      ProspectingCampaignWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }
}
