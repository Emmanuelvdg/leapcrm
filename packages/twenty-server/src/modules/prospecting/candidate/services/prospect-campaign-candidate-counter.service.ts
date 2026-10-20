import { Injectable } from '@nestjs/common';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { ProspectCandidateWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospect-candidate.workspace-entity';
import { ProspectingCampaignWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospecting-campaign.workspace-entity';

// Must run inside a workspace context. The counter is internal bookkeeping,
// so it is written regardless of the acting user's field permissions.
@Injectable()
export class ProspectCampaignCandidateCounterService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async refreshCandidatesFound({
    workspaceId,
    campaignId,
  }: {
    workspaceId: string;
    campaignId: string;
  }): Promise<number> {
    const candidateRepository =
      await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        ProspectCandidateWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );
    const campaignRepository =
      await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        ProspectingCampaignWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const candidatesFound = await candidateRepository.countBy({ campaignId });

    await campaignRepository.update({ id: campaignId }, { candidatesFound });

    return candidatesFound;
  }
}
