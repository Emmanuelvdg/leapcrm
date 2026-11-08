import { ICP_TIERS } from '@/icp-analysis/constants/IcpTiers';
import { type IcpAttributeValues } from '@/icp-analysis/types/IcpAttributeValue';
import { type IcpScoreDistribution } from '@/icp-analysis/types/IcpBacktestResult';
import { type IcpCriterion } from '@/icp-analysis/types/IcpCriterion';
import { type IcpTier } from '@/icp-analysis/types/IcpTier';
import { type IcpTierThresholds } from '@/icp-analysis/types/IcpTierThresholds';
import { computeIcpScore } from '@/icp-analysis/utils/computeIcpScore';

const computeMedian = (sortedValues: number[]): number | null => {
  if (sortedValues.length === 0) {
    return null;
  }

  const middleIndex = Math.floor(sortedValues.length / 2);

  return sortedValues.length % 2 === 1
    ? sortedValues[middleIndex]
    : (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
};

export const computeIcpScoreDistribution = ({
  criteria,
  thresholds,
  valuesList,
}: {
  criteria: IcpCriterion[];
  thresholds: IcpTierThresholds;
  valuesList: IcpAttributeValues[];
}): IcpScoreDistribution => {
  const tierCounts = Object.fromEntries(
    ICP_TIERS.map((tier) => [tier, 0]),
  ) as Record<IcpTier, number>;

  const scores = valuesList.map((values) => {
    const { score, tier } = computeIcpScore({ criteria, values, thresholds });

    tierCounts[tier] += 1;

    return score;
  });

  return {
    totalCount: valuesList.length,
    medianScore: computeMedian(
      [...scores].sort((first, second) => first - second),
    ),
    tierCounts,
  };
};
