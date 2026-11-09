import {
  type IcpAttributeDefinition,
  type IcpPatternAnalysis,
} from 'twenty-shared/icp-analysis';

import { type IcpDealWindow } from 'src/modules/icp-analysis/types/icp-evidence.type';

export type IcpModelAnalysisSnapshot = {
  analyzedAt: string;
  window: IcpDealWindow;
  excludedWithoutCompanyCount: number;
  isTruncated: boolean;
  attributes: IcpAttributeDefinition[];
  patterns: IcpPatternAnalysis;
};
