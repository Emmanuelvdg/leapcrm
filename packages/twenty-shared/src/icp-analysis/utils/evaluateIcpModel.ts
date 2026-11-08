import { ICP_MIN_ACTIVATION_AUC } from '@/icp-analysis/constants/IcpMinActivationAuc';
import { ICP_TIERS } from '@/icp-analysis/constants/IcpTiers';
import { type IcpCriterion } from '@/icp-analysis/types/IcpCriterion';
import { type IcpDatasetRow } from '@/icp-analysis/types/IcpDatasetRow';
import {
  type IcpModelEvaluation,
  type IcpScoredRow,
  type IcpTierSummary,
} from '@/icp-analysis/types/IcpModelEvaluation';
import { type IcpTierThresholds } from '@/icp-analysis/types/IcpTierThresholds';
import { computeAreaUnderRocCurve } from '@/icp-analysis/utils/computeAreaUnderRocCurve';
import { computeIcpScore } from '@/icp-analysis/utils/computeIcpScore';

export const evaluateIcpModel = ({
  criteria,
  thresholds,
  rows,
}: {
  criteria: IcpCriterion[];
  thresholds: IcpTierThresholds;
  rows: IcpDatasetRow[];
}): IcpModelEvaluation => {
  const scoredRows = rows.map((row): IcpScoredRow => {
    const { score, tier, coverage } = computeIcpScore({
      criteria,
      values: row.values,
      thresholds,
    });

    return { id: row.id, outcome: row.outcome, score, tier, coverage };
  });

  const wonCount = scoredRows.filter(({ outcome }) => outcome === 'WON').length;
  const baselineWinRate = rows.length > 0 ? wonCount / rows.length : null;

  const tiers = ICP_TIERS.map((tier): IcpTierSummary => {
    const tierRows = scoredRows.filter((row) => row.tier === tier);
    const tierWonCount = tierRows.filter(
      ({ outcome }) => outcome === 'WON',
    ).length;
    const winRate = tierRows.length > 0 ? tierWonCount / tierRows.length : null;

    return {
      tier,
      totalCount: tierRows.length,
      wonCount: tierWonCount,
      lostCount: tierRows.length - tierWonCount,
      winRate,
      lift:
        winRate !== null && baselineWinRate !== null && baselineWinRate > 0
          ? winRate / baselineWinRate
          : null,
    };
  });

  const auc = computeAreaUnderRocCurve(
    scoredRows.map(({ score, outcome }) => ({
      score,
      isPositive: outcome === 'WON',
    })),
  );

  const priorityWinRate =
    tiers.find(({ tier }) => tier === 'PRIORITY')?.winRate ?? null;

  return {
    totalCount: rows.length,
    wonCount,
    lostCount: rows.length - wonCount,
    baselineWinRate,
    tiers,
    auc,
    wonBelowTarget: scoredRows
      .filter(
        ({ outcome, tier }) =>
          outcome === 'WON' && (tier === 'NURTURE' || tier === 'EXCLUDED'),
      )
      .sort((first, second) => first.score - second.score),
    lostInPriority: scoredRows
      .filter(({ outcome, tier }) => outcome === 'LOST' && tier === 'PRIORITY')
      .sort((first, second) => second.score - first.score),
    rows: scoredRows,
    doesPriorityBeatBaseline:
      priorityWinRate !== null && baselineWinRate !== null
        ? priorityWinRate > baselineWinRate
        : null,
    isAucBelowActivationThreshold:
      auc !== null ? auc < ICP_MIN_ACTIVATION_AUC : null,
  };
};
