import { type IcpTierSummary } from 'twenty-shared/icp-analysis';

export type IcpModelEvaluationSnapshot = {
  totalCount: number;
  wonCount: number;
  lostCount: number;
  baselineWinRate: number | null;
  tiers: IcpTierSummary[];
  auc: number | null;
  wonBelowTargetCount: number;
  lostInPriorityCount: number;
  doesPriorityBeatBaseline: boolean | null;
  isAucBelowActivationThreshold: boolean | null;
};

export type IcpModelBacktestSnapshot = {
  computedAt: string;
  inSample: IcpModelEvaluationSnapshot;
  holdout: {
    trainingCount: number;
    testCount: number;
    evaluation: IcpModelEvaluationSnapshot;
  } | null;
};
