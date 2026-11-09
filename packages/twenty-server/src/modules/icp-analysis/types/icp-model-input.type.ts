import { type IcpModelWorkspaceEntity } from 'src/modules/icp-analysis/standard-objects/icp-model.workspace-entity';

export type IcpModelInput = Partial<
  Omit<
    IcpModelWorkspaceEntity,
    'datasetStartDate' | 'datasetEndDate' | 'criteria' | 'tierThresholds'
  > & {
    datasetStartDate: Date | string | null;
    datasetEndDate: Date | string | null;
    criteria: unknown;
    tierThresholds: unknown;
  }
>;
