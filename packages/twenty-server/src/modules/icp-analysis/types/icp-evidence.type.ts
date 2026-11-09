import {
  type IcpAttributeDefinition,
  type IcpDatasetRow,
} from 'twenty-shared/icp-analysis';

export type IcpDealWindow = {
  start: string;
  end: string | null;
};

export type IcpEvidence = {
  attributes: IcpAttributeDefinition[];
  rows: IcpDatasetRow[];
  window: IcpDealWindow;
  excludedWithoutCompanyCount: number;
  isTruncated: boolean;
};
