import { type IcpAttributeValues } from '@/icp-analysis/types/IcpAttributeValue';
import { type IcpCriterion } from '@/icp-analysis/types/IcpCriterion';
import {
  type IcpScoreReason,
  type IcpScoreResult,
} from '@/icp-analysis/types/IcpScoreResult';
import { type IcpTierThresholds } from '@/icp-analysis/types/IcpTierThresholds';
import { computeIcpTier } from '@/icp-analysis/utils/computeIcpTier';
import { doesIcpCriterionMatch } from '@/icp-analysis/utils/doesIcpCriterionMatch';
import { isIcpAttributeValueKnown } from '@/icp-analysis/utils/isIcpAttributeValueKnown';

const MAX_UNKNOWN_REASON_COUNT = 2;

type MatchReason = Extract<IcpScoreReason, { type: 'MATCH' }>;
type UnknownReason = Extract<IcpScoreReason, { type: 'UNKNOWN' }>;

const groupCriteriaByAttributeKey = (
  criteria: IcpCriterion[],
): Map<string, IcpCriterion[]> =>
  criteria.reduce((criteriaByAttributeKey, criterion) => {
    criteriaByAttributeKey.set(criterion.attributeKey, [
      ...(criteriaByAttributeKey.get(criterion.attributeKey) ?? []),
      criterion,
    ]);

    return criteriaByAttributeKey;
  }, new Map<string, IcpCriterion[]>());

const toMatchReason = (criterion: IcpCriterion): MatchReason => ({
  type: 'MATCH',
  criterionId: criterion.id,
  label: criterion.label,
  weight: criterion.weight,
  isHardExclusion: criterion.isHardExclusion,
});

// Each attribute adds at most its best matched positive weight and its worst
// matched negative weight, so overlapping criteria or multi-select values
// cannot stack points past the maximum.
export const computeIcpScore = ({
  criteria,
  values,
  thresholds,
}: {
  criteria: IcpCriterion[];
  values: IcpAttributeValues;
  thresholds: IcpTierThresholds;
}): IcpScoreResult => {
  let maxScore = 0;
  let rawScore = 0;
  let totalWeightMass = 0;
  let knownWeightMass = 0;
  let isHardExcluded = false;

  const matchReasons: MatchReason[] = [];
  const unknownReasons: UnknownReason[] = [];

  for (const [attributeKey, attributeCriteria] of groupCriteriaByAttributeKey(
    criteria,
  )) {
    const weights = attributeCriteria.map(({ weight }) => weight);
    const bestPositiveWeight = Math.max(0, ...weights);
    const worstNegativeWeight = Math.min(0, ...weights);
    const weightMass = bestPositiveWeight - worstNegativeWeight;

    maxScore += bestPositiveWeight;
    totalWeightMass += weightMass;

    const value = values[attributeKey];

    if (!isIcpAttributeValueKnown(value)) {
      if (bestPositiveWeight > 0) {
        unknownReasons.push({
          type: 'UNKNOWN',
          attributeKey,
          attributeLabel: attributeCriteria[0].attributeLabel,
          weight: bestPositiveWeight,
        });
      }

      continue;
    }

    knownWeightMass += weightMass;

    const matchedCriteria = attributeCriteria.filter((criterion) =>
      doesIcpCriterionMatch(criterion.match, value),
    );

    const bestMatchedPositive = matchedCriteria
      .filter(({ weight }) => weight > 0)
      .sort((first, second) => second.weight - first.weight)[0];

    const worstMatchedNegative = matchedCriteria
      .filter(({ weight }) => weight < 0)
      .sort((first, second) => first.weight - second.weight)[0];

    const matchedHardExclusions = matchedCriteria.filter(
      ({ isHardExclusion }) => isHardExclusion,
    );

    if (matchedHardExclusions.length > 0) {
      isHardExcluded = true;
    }

    const countedCriteria = [bestMatchedPositive, worstMatchedNegative].filter(
      (criterion): criterion is IcpCriterion => criterion !== undefined,
    );

    for (const criterion of countedCriteria) {
      rawScore += criterion.weight;
    }

    const reasonCriteria = [
      ...countedCriteria,
      ...matchedHardExclusions.filter(
        (hardExclusion) => !countedCriteria.includes(hardExclusion),
      ),
    ];

    matchReasons.push(...reasonCriteria.map(toMatchReason));
  }

  const score =
    maxScore > 0
      ? Math.min(100, Math.max(0, Math.round((100 * rawScore) / maxScore)))
      : 0;

  const coverage =
    totalWeightMass > 0
      ? Math.round((100 * knownWeightMass) / totalWeightMass)
      : 0;

  const sortedMatchReasons = [...matchReasons].sort(
    (first, second) =>
      Number(second.isHardExclusion) - Number(first.isHardExclusion) ||
      Math.abs(second.weight) - Math.abs(first.weight),
  );

  const topUnknownReasons = [...unknownReasons]
    .sort((first, second) => second.weight - first.weight)
    .slice(0, MAX_UNKNOWN_REASON_COUNT);

  return {
    score,
    tier: computeIcpTier({ score, thresholds, isHardExcluded }),
    coverage,
    isHardExcluded,
    reasons: [...sortedMatchReasons, ...topUnknownReasons],
  };
};
