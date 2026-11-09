import {
  type IcpAttributeDefinition,
  type IcpCriterion,
  type IcpPatternAnalysis,
  type IcpTierThresholds,
} from 'twenty-shared/icp-analysis';

import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

export type IcpModelStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type IcpModelAnalysisSnapshot = {
  analyzedAt: string;
  window: { start: string; end: string | null };
  excludedWithoutCompanyCount: number;
  isTruncated: boolean;
  attributes: IcpAttributeDefinition[];
  patterns: IcpPatternAnalysis;
};

export type IcpModelRecord = ObjectRecord & {
  name: string | null;
  status: IcpModelStatus;
  version: number;
  criteria: IcpCriterion[] | null;
  tierThresholds: IcpTierThresholds | null;
  analysis: IcpModelAnalysisSnapshot | null;
  analyzedAt: string | null;
};
