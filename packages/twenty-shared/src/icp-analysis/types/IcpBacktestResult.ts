import { type IcpCriterion } from '@/icp-analysis/types/IcpCriterion';
import { type IcpModelEvaluation } from '@/icp-analysis/types/IcpModelEvaluation';
import { type IcpTier } from '@/icp-analysis/types/IcpTier';

export type IcpScoreDistribution = {
  totalCount: number;
  medianScore: number | null;
  tierCounts: Record<IcpTier, number>;
};

export type IcpHoldoutEvaluation = {
  trainingCount: number;
  testCount: number;
  criteria: IcpCriterion[];
  evaluation: IcpModelEvaluation;
};

export type IcpBacktestResult = {
  inSample: IcpModelEvaluation;
  holdout: IcpHoldoutEvaluation | null;
  comparison: IcpScoreDistribution | null;
};
