import {
  type IcpAttributeDefinition,
  type IcpDatasetRow,
} from 'twenty-shared/icp-analysis';

export type IcpEvidence = {
  attributes: IcpAttributeDefinition[];
  rows: IcpDatasetRow[];
};
