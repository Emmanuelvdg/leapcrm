import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { ProspectingJobLedgerService } from 'src/engine/core-modules/prospecting-job/services/prospecting-job-ledger.service';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { DiscoveryProviderRegistryService } from 'src/modules/prospecting/discovery/services/discovery-provider-registry.service';
import {
  buildDiscoveryStages,
  type DiscoveryStage,
} from 'src/modules/prospecting/discovery/utils/build-discovery-stages.util';
import { buildDiscoverPageJob } from 'src/modules/prospecting/discovery/utils/discover-page-job.util';
import { ProspectingException } from 'src/modules/prospecting/exceptions/prospecting.exception';
import { ProspectingCampaignWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospecting-campaign.workspace-entity';
import { type ProspectingCampaignStatus } from 'src/modules/prospecting/types/prospecting-campaign-status.type';
import { buildCampaignStatusChangeCriteria } from 'src/modules/prospecting/utils/build-campaign-status-change-criteria.util';
import { isProspectingCampaignStatusTransitionAllowed } from 'src/modules/prospecting/utils/is-prospecting-campaign-status-transition-allowed.util';
import { startableProspectingCampaignSchema } from 'src/modules/prospecting/zod-schemas/startable-prospecting-campaign.zod-schema';

type ProspectingCampaignActionArgs = {
  workspaceId: string;
  userWorkspaceId: string;
  campaignId: string;
};

type ProspectingCampaignStatusChange = {
  campaignId: string;
  status: ProspectingCampaignStatus;
};

type CampaignUpdate = Partial<
  Pick<ProspectingCampaignWorkspaceEntity, 'lastRunAt' | 'discoverySources'>
>;

type CampaignRunPlan = {
  update: CampaignUpdate;
  firstStage: DiscoveryStage;
  icpVersion: number;
};

@Injectable()
export class ProspectingCampaignService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly userRoleService: UserRoleService,
    private readonly prospectingJobLedgerService: ProspectingJobLedgerService,
    private readonly discoveryProviderRegistryService: DiscoveryProviderRegistryService,
  ) {}

  async start(
    args: ProspectingCampaignActionArgs,
  ): Promise<ProspectingCampaignStatusChange> {
    const { statusChange, plan } = await this.transitionStatus({
      ...args,
      allowedFromStatuses: ['DRAFT'],
      toStatus: 'RUNNING',
      prepare: (campaign) => this.buildRunPlanOrThrow(campaign),
    });

    if (isDefined(plan)) {
      await this.planFirstDiscoveryJob({ ...args, plan });
    }

    return statusChange;
  }

  async pause(
    args: ProspectingCampaignActionArgs,
  ): Promise<ProspectingCampaignStatusChange> {
    const { statusChange } = await this.transitionStatus({
      ...args,
      allowedFromStatuses: ['RUNNING'],
      toStatus: 'PAUSED',
    });

    await this.prospectingJobLedgerService.holdCampaignJobs({
      workspaceId: args.workspaceId,
      campaignId: args.campaignId,
    });

    return statusChange;
  }

  // The ICP can be edited while paused, so it is validated again on resume.
  async resume(
    args: ProspectingCampaignActionArgs,
  ): Promise<ProspectingCampaignStatusChange> {
    const { statusChange, plan } = await this.transitionStatus({
      ...args,
      allowedFromStatuses: ['PAUSED'],
      toStatus: 'RUNNING',
      prepare: (campaign) => this.buildRunPlanOrThrow(campaign),
    });

    const releasedJobCount =
      await this.prospectingJobLedgerService.releaseCampaignJobs({
        workspaceId: args.workspaceId,
        campaignId: args.campaignId,
      });

    // Nothing was on hold, for example when the ICP changed and the old jobs
    // no longer apply: plan again. Pages already done keep their keys and are
    // not repeated.
    if (releasedJobCount === 0 && isDefined(plan)) {
      await this.planFirstDiscoveryJob({ ...args, plan });
    }

    return statusChange;
  }

  async cancel(
    args: ProspectingCampaignActionArgs,
  ): Promise<ProspectingCampaignStatusChange> {
    const { statusChange } = await this.transitionStatus({
      ...args,
      allowedFromStatuses: ['DRAFT', 'RUNNING', 'PAUSED'],
      toStatus: 'CANCELLED',
    });

    await this.prospectingJobLedgerService.cancelCampaignJobs({
      workspaceId: args.workspaceId,
      campaignId: args.campaignId,
    });

    return statusChange;
  }

  private async planFirstDiscoveryJob({
    workspaceId,
    campaignId,
    plan,
  }: ProspectingCampaignActionArgs & { plan: CampaignRunPlan }): Promise<void> {
    await this.prospectingJobLedgerService.createJobs([
      buildDiscoverPageJob({
        workspaceId,
        campaignId,
        icpVersion: plan.icpVersion,
        stage: plan.firstStage,
        cursor: null,
        pageIndex: 0,
      }),
    ]);
  }

  private async transitionStatus({
    workspaceId,
    userWorkspaceId,
    campaignId,
    allowedFromStatuses,
    toStatus,
    prepare,
  }: ProspectingCampaignActionArgs & {
    allowedFromStatuses: ProspectingCampaignStatus[];
    toStatus: ProspectingCampaignStatus;
    prepare?: (campaign: ProspectingCampaignWorkspaceEntity) => CampaignRunPlan;
  }): Promise<{
    statusChange: ProspectingCampaignStatusChange;
    plan: CampaignRunPlan | undefined;
  }> {
    const roleId = await this.userRoleService.getRoleIdForUserWorkspace({
      workspaceId,
      userWorkspaceId,
    });

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const campaignRepository =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            ProspectingCampaignWorkspaceEntity,
            { unionOf: [roleId] },
          );

        const campaign = await campaignRepository.findOne({
          where: { id: campaignId },
        });

        if (!isDefined(campaign)) {
          throw new ProspectingException(
            `Prospecting campaign ${campaignId} not found`,
            'CAMPAIGN_NOT_FOUND',
          );
        }

        if (
          !allowedFromStatuses.includes(campaign.status) ||
          !isProspectingCampaignStatusTransitionAllowed({
            fromStatus: campaign.status,
            toStatus,
          })
        ) {
          throw new ProspectingException(
            `Cannot move prospecting campaign ${campaignId} from ${campaign.status} to ${toStatus}`,
            'INVALID_CAMPAIGN_STATUS_TRANSITION',
          );
        }

        const plan = prepare?.(campaign);

        // Conditional on the status read above, so two concurrent actions on
        // the same campaign cannot both apply.
        const { affected } = await campaignRepository.update(
          {
            id: campaignId,
            status: buildCampaignStatusChangeCriteria({
              fromStatus: campaign.status,
              toStatus,
            }),
          },
          { ...(plan?.update ?? {}), status: toStatus },
        );

        if (affected !== 1) {
          throw new ProspectingException(
            `Prospecting campaign ${campaignId} changed status concurrently`,
            'CAMPAIGN_STATUS_CONFLICT',
          );
        }

        return { statusChange: { campaignId, status: toStatus }, plan };
      },
    );
  }

  // An empty source list means automatic selection; the resolved list is saved
  // so the campaign shows which sources ran.
  private buildRunPlanOrThrow(
    campaign: ProspectingCampaignWorkspaceEntity,
  ): CampaignRunPlan {
    const startableCampaign =
      startableProspectingCampaignSchema.safeParse(campaign);

    if (!startableCampaign.success) {
      throw this.buildNotStartableException(
        campaign.id,
        startableCampaign.error.issues
          .map((issue) =>
            [issue.path.join('.'), issue.message].filter(Boolean).join(' '),
          )
          .join(', '),
      );
    }

    const { icp, discoverySources } = startableCampaign.data;
    const unknownProviderIds =
      this.discoveryProviderRegistryService.findUnknownProviderIds(
        discoverySources,
      );

    if (unknownProviderIds.length > 0) {
      throw this.buildNotStartableException(
        campaign.id,
        `unknown discovery sources ${unknownProviderIds.join(', ')}`,
      );
    }

    const resolvedDiscoverySources =
      discoverySources.length > 0
        ? discoverySources
        : this.discoveryProviderRegistryService.selectProviderIds(icp);

    if (resolvedDiscoverySources.length === 0) {
      throw this.buildNotStartableException(
        campaign.id,
        'no discovery source covers this ICP, add a target country or keyword',
      );
    }

    const [firstStage] = buildDiscoveryStages({
      countryCodes: icp.targetGeographies.map(({ countryCode }) => countryCode),
      providerIds: resolvedDiscoverySources,
    });

    return {
      update: {
        lastRunAt: new Date(),
        discoverySources: resolvedDiscoverySources,
      },
      firstStage,
      icpVersion: campaign.icpVersion,
    };
  }

  private buildNotStartableException(
    campaignId: string,
    reason: string,
  ): ProspectingException {
    return new ProspectingException(
      `Prospecting campaign ${campaignId} cannot start: ${reason}`,
      'CAMPAIGN_NOT_STARTABLE',
    );
  }
}
