import { type IcpOutcome } from '@/icp-analysis/types/IcpOutcome';
import { type IcpTier } from '@/icp-analysis/types/IcpTier';

export type IcpScoredRow = {
  id: string;
  name?: string | null;
  outcome: IcpOutcome;
  score: number;
  tier: IcpTier;
  coverage: number;
};

export type IcpTierSummary = {
  tier: IcpTier;
  totalCount: number;
  wonCount: number;
  lostCount: number;
  winRate: number | null;
  lift: number | null;
};

export type IcpModelEvaluation = {
  totalCount: number;
  wonCount: number;
  lostCount: number;
  baselineWinRate: number | null;
  tiers: IcpTierSummary[];
  auc: number | null;
  wonBelowTarget: IcpScoredRow[];
  lostInPriority: IcpScoredRow[];
  rows: IcpScoredRow[];
  doesPriorityBeatBaseline: boolean | null;
  isAucBelowActivationThreshold: boolean | null;
};
