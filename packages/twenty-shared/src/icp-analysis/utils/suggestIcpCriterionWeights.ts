import { ICP_CATEGORY_WEIGHT_CAPS } from '@/icp-analysis/constants/IcpCategoryWeightCaps';
import { ICP_CRITERION_MAX_WEIGHT } from '@/icp-analysis/constants/IcpCriterionMaxWeight';
import { ICP_CRITERION_MIN_WEIGHT } from '@/icp-analysis/constants/IcpCriterionMinWeight';
import { ICP_ATTRIBUTE_CATEGORIES } from '@/icp-analysis/constants/IcpAttributeCategories';
import { type IcpAttributeCategory } from '@/icp-analysis/types/IcpAttributeCategory';
import { type IcpCriterion } from '@/icp-analysis/types/IcpCriterion';
import {
  type IcpAttributePatterns,
  type IcpPatternAnalysis,
  type IcpPatternBucket,
} from '@/icp-analysis/types/IcpPatternAnalysis';

const DEFAULT_MAX_SUGGESTED_CRITERIA_COUNT = 15;
const MAX_SUGGESTED_CRITERIA_PER_ATTRIBUTE = 3;
const WEIGHT_PER_LOG_ODDS_RATIO = 20;
// A bucket needs about this many deals before its own win rate outweighs the
// baseline in the shrunk strength.
const SHRINKAGE_PRIOR_SAMPLE_SIZE = 10;
const WEIGHT_STEP = 5;
const MIN_POSITIVE_WEIGHT = 5;
const MIN_NEGATIVE_WEIGHT_MAGNITUDE = 10;

type WeightCandidate = {
  attribute: IcpAttributePatterns;
  bucket: IcpPatternBucket;
  strength: number;
  rawWeight: number;
};

const roundToWeightStep = (weight: number): number =>
  Math.round(weight / WEIGHT_STEP) * WEIGHT_STEP || 0;

const floorToWeightStep = (weight: number): number =>
  Math.floor(weight / WEIGHT_STEP) * WEIGHT_STEP || 0;

export const computeIcpBucketStrength = ({
  bucket,
  analysis,
}: {
  bucket: IcpPatternBucket;
  analysis: Pick<IcpPatternAnalysis, 'wonCount' | 'lostCount'>;
}): number => {
  const bucketOdds = (bucket.wonCount + 1) / (bucket.lostCount + 1);
  const baselineOdds = (analysis.wonCount + 1) / (analysis.lostCount + 1);
  const shrinkage =
    bucket.totalCount / (bucket.totalCount + SHRINKAGE_PRIOR_SAMPLE_SIZE);

  return Math.log(bucketOdds / baselineOdds) * shrinkage;
};

const isStrongEnough = ({ rawWeight }: WeightCandidate): boolean => {
  const roundedWeight = roundToWeightStep(rawWeight);

  return (
    roundedWeight >= MIN_POSITIVE_WEIGHT ||
    roundedWeight <= -MIN_NEGATIVE_WEIGHT_MAGNITUDE
  );
};

const byStrengthMagnitude = (
  first: WeightCandidate,
  second: WeightCandidate,
): number => Math.abs(second.strength) - Math.abs(first.strength);

const keepStrongestPerAttribute = (
  candidates: WeightCandidate[],
): WeightCandidate[] => {
  const keptCountByAttributeKey = new Map<string, number>();

  return [...candidates].sort(byStrengthMagnitude).filter(({ attribute }) => {
    const keptCount = keptCountByAttributeKey.get(attribute.attributeKey) ?? 0;

    if (keptCount >= MAX_SUGGESTED_CRITERIA_PER_ATTRIBUTE) {
      return false;
    }

    keptCountByAttributeKey.set(attribute.attributeKey, keptCount + 1);

    return true;
  });
};

// The score's maximum is the sum of each attribute's best positive weight, so
// a category's cap applies to that sum.
const computeCategoryScaleFactors = (
  candidates: WeightCandidate[],
): Record<IcpAttributeCategory, number> => {
  const bestPositiveRawWeightByAttributeKey = new Map<string, number>();

  for (const { attribute, rawWeight } of candidates) {
    if (rawWeight > 0) {
      bestPositiveRawWeightByAttributeKey.set(
        attribute.attributeKey,
        Math.max(
          bestPositiveRawWeightByAttributeKey.get(attribute.attributeKey) ?? 0,
          rawWeight,
        ),
      );
    }
  }

  return Object.fromEntries(
    ICP_ATTRIBUTE_CATEGORIES.map((category) => {
      const categoryAttributeKeys = new Set(
        candidates
          .filter(({ attribute }) => attribute.category === category)
          .map(({ attribute }) => attribute.attributeKey),
      );
      const categoryTotal = [...categoryAttributeKeys].reduce(
        (total, attributeKey) =>
          total + (bestPositiveRawWeightByAttributeKey.get(attributeKey) ?? 0),
        0,
      );
      const categoryCap = ICP_CATEGORY_WEIGHT_CAPS[category];

      return [
        category,
        categoryTotal > categoryCap ? categoryCap / categoryTotal : 1,
      ];
    }),
  ) as Record<IcpAttributeCategory, number>;
};

const computeWeight = (
  { attribute, rawWeight }: WeightCandidate,
  categoryScaleFactors: Record<IcpAttributeCategory, number>,
): number => {
  if (rawWeight < 0) {
    return Math.max(ICP_CRITERION_MIN_WEIGHT, roundToWeightStep(rawWeight));
  }

  const scaleFactor = categoryScaleFactors[attribute.category];
  const scaledWeight = rawWeight * scaleFactor;
  // Flooring after scaling keeps the category under its cap.
  const steppedWeight =
    scaleFactor < 1
      ? floorToWeightStep(scaledWeight)
      : roundToWeightStep(scaledWeight);

  return Math.min(
    ICP_CRITERION_MAX_WEIGHT,
    ICP_CATEGORY_WEIGHT_CAPS[attribute.category],
    steppedWeight,
  );
};

export const suggestIcpCriterionWeights = ({
  analysis,
  maxCriteriaCount = DEFAULT_MAX_SUGGESTED_CRITERIA_COUNT,
}: {
  analysis: IcpPatternAnalysis;
  maxCriteriaCount?: number;
}): IcpCriterion[] => {
  const candidates = analysis.attributes
    .flatMap((attribute) =>
      attribute.buckets
        .filter(({ isLowSample }) => !isLowSample)
        .map((bucket): WeightCandidate => {
          const strength = computeIcpBucketStrength({ bucket, analysis });

          return {
            attribute,
            bucket,
            strength,
            rawWeight: strength * WEIGHT_PER_LOG_ODDS_RATIO,
          };
        }),
    )
    .filter(isStrongEnough);

  const selectedCandidates = keepStrongestPerAttribute(candidates).slice(
    0,
    maxCriteriaCount,
  );

  const categoryScaleFactors = computeCategoryScaleFactors(selectedCandidates);

  return selectedCandidates
    .map((candidate): IcpCriterion => {
      const { attribute, bucket } = candidate;

      return {
        id: bucket.key,
        attributeKey: attribute.attributeKey,
        attributeLabel: attribute.label,
        label: `${attribute.label}: ${bucket.label}`,
        category: attribute.category,
        match: bucket.match,
        weight: computeWeight(candidate, categoryScaleFactors),
        isHardExclusion: false,
      };
    })
    .filter(({ weight }) => weight !== 0)
    .sort((first, second) => second.weight - first.weight);
};
