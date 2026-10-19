import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { ProspectingJobLedgerService } from 'src/engine/core-modules/prospecting-job/services/prospecting-job-ledger.service';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { ProspectingException } from 'src/modules/prospecting/exceptions/prospecting.exception';
import { ProspectingCampaignWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospecting-campaign.workspace-entity';
import { type ProspectingCampaignStatus } from 'src/modules/prospecting/types/prospecting-campaign-status.type';
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

@Injectable()
export class ProspectingCampaignService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly userRoleService: UserRoleService,
    private readonly prospectingJobLedgerService: ProspectingJobLedgerService,
  ) {}

  async start(
    args: ProspectingCampaignActionArgs,
  ): Promise<ProspectingCampaignStatusChange> {
    return this.transitionStatus({
      ...args,
      allowedFromStatuses: ['DRAFT'],
      toStatus: 'RUNNING',
      buildUpdate: (campaign) => {
        this.assertStartableOrThrow(campaign);

        return { lastRunAt: new Date() };
      },
    });
  }

  async pause(
    args: ProspectingCampaignActionArgs,
  ): Promise<ProspectingCampaignStatusChange> {
    const statusChange = await this.transitionStatus({
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
    const statusChange = await this.transitionStatus({
      ...args,
      allowedFromStatuses: ['PAUSED'],
      toStatus: 'RUNNING',
      buildUpdate: (campaign) => {
        this.assertStartableOrThrow(campaign);

        return { lastRunAt: new Date() };
      },
    });

    await this.prospectingJobLedgerService.releaseCampaignJobs({
      workspaceId: args.workspaceId,
      campaignId: args.campaignId,
    });

    return statusChange;
  }

  async cancel(
    args: ProspectingCampaignActionArgs,
  ): Promise<ProspectingCampaignStatusChange> {
    const statusChange = await this.transitionStatus({
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

  private async transitionStatus({
    workspaceId,
    userWorkspaceId,
    campaignId,
    allowedFromStatuses,
    toStatus,
    buildUpdate,
  }: ProspectingCampaignActionArgs & {
    allowedFromStatuses: ProspectingCampaignStatus[];
    toStatus: ProspectingCampaignStatus;
    buildUpdate?: (
      campaign: ProspectingCampaignWorkspaceEntity,
    ) => Partial<Pick<ProspectingCampaignWorkspaceEntity, 'lastRunAt'>>;
  }): Promise<ProspectingCampaignStatusChange> {
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

        const additionalUpdate = buildUpdate?.(campaign) ?? {};

        // Conditional on the status read above, so two concurrent actions on
        // the same campaign cannot both apply.
        const { affected } = await campaignRepository.update(
          { id: campaignId, status: campaign.status },
          { ...additionalUpdate, status: toStatus },
        );

        if (affected !== 1) {
          throw new ProspectingException(
            `Prospecting campaign ${campaignId} changed status concurrently`,
            'CAMPAIGN_STATUS_CONFLICT',
          );
        }

        return { campaignId, status: toStatus };
      },
    );
  }

  private assertStartableOrThrow(
    campaign: ProspectingCampaignWorkspaceEntity,
  ): void {
    const startableCampaign =
      startableProspectingCampaignSchema.safeParse(campaign);

    if (!startableCampaign.success) {
      throw new ProspectingException(
        `Prospecting campaign ${campaign.id} cannot start: ${startableCampaign.error.issues
          .map((issue) =>
            [issue.path.join('.'), issue.message].filter(Boolean).join(' '),
          )
          .join(', ')}`,
        'CAMPAIGN_NOT_STARTABLE',
      );
    }
  }
}
