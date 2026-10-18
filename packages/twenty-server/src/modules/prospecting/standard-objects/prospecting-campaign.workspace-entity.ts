import { type ActorMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type ProspectCandidateWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospect-candidate.workspace-entity';

export class ProspectingCampaignWorkspaceEntity extends BaseWorkspaceEntity {
  position: number;
  name: string | null;
  objective: string | null;
  status: string;
  icp: Record<string, unknown> | null;
  icpVersion: number;
  discoverySources: string[] | null;
  targetCandidateCount: number | null;
  candidatesFound: number;
  lastRunAt: Date | null;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
  candidates: EntityRelation<ProspectCandidateWorkspaceEntity[]>;
}
