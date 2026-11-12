import {
  type IcpCriterion,
  type IcpTierThresholds,
} from 'twenty-shared/icp-analysis';
import { type ActorMetadata, type RichTextMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type IcpModelBacktestSnapshot } from 'src/modules/icp-analysis/types/icp-model-backtest-snapshot.type';
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
  criteria: IcpCriterion[] | null;
  tierThresholds: IcpTierThresholds | null;
  analysis: Record<string, unknown> | null;
  backtest: IcpModelBacktestSnapshot | null;
  insights: RichTextMetadata | null;
  analyzedAt: Date | null;
  activatedAt: Date | null;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
}
