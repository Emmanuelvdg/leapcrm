import { type ActorMetadata, type LinksMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import { type ProspectingCampaignWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospecting-campaign.workspace-entity';

export class ProspectCandidateWorkspaceEntity extends BaseWorkspaceEntity {
  position: number;
  name: string | null;
  domain: LinksMetadata;
  registrationNumber: string | null;
  registrationAuthority: string | null;
  lei: string | null;
  country: string | null;
  region: string | null;
  industry: string | null;
  industryCode: string | null;
  employeeCount: number | null;
  description: string | null;
  lifecycleStage: string;
  matchStatus: string | null;
  identityKey: string;
  sources: Record<string, unknown>[] | null;
  attributes: Record<string, unknown> | null;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
  campaign: EntityRelation<ProspectingCampaignWorkspaceEntity> | null;
  campaignId: string | null;
  matchedCompany: EntityRelation<CompanyWorkspaceEntity> | null;
  matchedCompanyId: string | null;
}
