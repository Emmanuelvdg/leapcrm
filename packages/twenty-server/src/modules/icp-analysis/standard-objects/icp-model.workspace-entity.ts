import { type ActorMetadata, type RichTextMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type IcpModelStatus } from 'src/modules/icp-analysis/types/icp-model-status.type';

export class IcpModelWorkspaceEntity extends BaseWorkspaceEntity {
  position: number;
  name: string | null;
  status: IcpModelStatus;
  version: number;
  wonStages: string[] | null;
  lostStages: string[] | null;
  datasetStartDate: Date | null;
  datasetEndDate: Date | null;
  criteria: unknown[] | null;
  tierThresholds: Record<string, unknown> | null;
  analysis: Record<string, unknown> | null;
  backtest: Record<string, unknown> | null;
  insights: RichTextMetadata | null;
  analyzedAt: Date | null;
  activatedAt: Date | null;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
}
