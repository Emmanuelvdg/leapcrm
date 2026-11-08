import { type IcpAttributeCategory } from '@/icp-analysis/types/IcpAttributeCategory';
import { type IcpAttributeValueType } from '@/icp-analysis/types/IcpAttributeValueType';
import { type IcpCriterionMatch } from '@/icp-analysis/types/IcpCriterion';

export type IcpPatternDirection = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export type IcpPatternBucket = {
  key: string;
  attributeKey: string;
  label: string;
  match: IcpCriterionMatch;
  wonCount: number;
  lostCount: number;
  totalCount: number;
  winRate: number;
  lift: number;
  interval: { lower: number; upper: number };
  direction: IcpPatternDirection;
  isLowSample: boolean;
  lostReasonCounts: Record<string, number>;
};

export type IcpAttributePatterns = {
  attributeKey: string;
  label: string;
  category: IcpAttributeCategory;
  valueType: IcpAttributeValueType;
  knownCount: number;
  coverage: number;
  buckets: IcpPatternBucket[];
};

export type IcpPatternAnalysis = {
  totalCount: number;
  wonCount: number;
  lostCount: number;
  baselineWinRate: number;
  isSampleSizeSufficient: boolean;
  attributes: IcpAttributePatterns[];
};
