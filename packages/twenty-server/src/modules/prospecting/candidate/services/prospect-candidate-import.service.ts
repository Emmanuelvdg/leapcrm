import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { ProspectCampaignCandidateCounterService } from 'src/modules/prospecting/candidate/services/prospect-campaign-candidate-counter.service';
import { ProspectCandidateWriterService } from 'src/modules/prospecting/candidate/services/prospect-candidate-writer.service';
import {
  type CustomerImportRow,
  normalizeCustomerImportRow,
} from 'src/modules/prospecting/candidate/utils/normalize-customer-import-row.util';
import { ProspectingException } from 'src/modules/prospecting/exceptions/prospecting.exception';
import { ProspectingCampaignWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospecting-campaign.workspace-entity';
import { type ProspectingCampaignStatus } from 'src/modules/prospecting/types/prospecting-campaign-status.type';

const IMPORTABLE_CAMPAIGN_STATUSES: ProspectingCampaignStatus[] = [
  'DRAFT',
  'RUNNING',
  'PAUSED',
];

export type ProspectCandidateImportResult = {
  campaignId: string;
  createdCount: number;
  mergedCount: number;
  candidatesFound: number;
};

@Injectable()
export class ProspectCandidateImportService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly userRoleService: UserRoleService,
    private readonly prospectCandidateWriterService: ProspectCandidateWriterService,
    private readonly prospectCampaignCandidateCounterService: ProspectCampaignCandidateCounterService,
  ) {}

  async importCompanies({
    workspaceId,
    userWorkspaceId,
    campaignId,
    rows,
  }: {
    workspaceId: string;
    userWorkspaceId: string;
    campaignId: string;
    rows: CustomerImportRow[];
  }): Promise<ProspectCandidateImportResult> {
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

        if (!IMPORTABLE_CAMPAIGN_STATUSES.includes(campaign.status)) {
          throw new ProspectingException(
            `Cannot import into prospecting campaign ${campaignId} in status ${campaign.status}`,
            'CAMPAIGN_NOT_IMPORTABLE',
          );
        }

        const importedAt = new Date().toISOString();

        const writtenCandidates =
          await this.prospectCandidateWriterService.writeDiscoveredCompanies({
            workspaceId,
            campaignId,
            discoveredCompanies: rows.map((row) =>
              normalizeCustomerImportRow({ row, importedAt }),
            ),
            writePermissions: { unionOf: [roleId] },
          });

        const candidatesFound =
          await this.prospectCampaignCandidateCounterService.refreshCandidatesFound(
            {
              workspaceId,
              campaignId,
            },
          );

        return {
          campaignId,
          createdCount: writtenCandidates.filter(
            ({ outcome }) => outcome === 'CREATED',
          ).length,
          mergedCount: writtenCandidates.filter(
            ({ outcome }) => outcome === 'MERGED',
          ).length,
          candidatesFound,
        };
      },
    );
  }
}
