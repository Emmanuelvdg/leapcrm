import { ICP_MIN_BUCKET_SAMPLE_SIZE } from '@/icp-analysis/constants/IcpMinBucketSampleSize';
import { ICP_SUFFICIENT_SAMPLE_SIZE_PER_OUTCOME } from '@/icp-analysis/constants/IcpSufficientSampleSizePerOutcome';
import { type IcpAttributeDefinition } from '@/icp-analysis/types/IcpAttributeDefinition';
import { type IcpCriterionMatch } from '@/icp-analysis/types/IcpCriterion';
import { type IcpDatasetRow } from '@/icp-analysis/types/IcpDatasetRow';
import {
  type IcpAttributePatterns,
  type IcpPatternAnalysis,
  type IcpPatternBucket,
  type IcpPatternDirection,
} from '@/icp-analysis/types/IcpPatternAnalysis';
import { bucketIcpNumericValues } from '@/icp-analysis/utils/bucketIcpNumericValues';
import { computeWilsonScoreInterval } from '@/icp-analysis/utils/computeWilsonScoreInterval';
import { doesIcpCriterionMatch } from '@/icp-analysis/utils/doesIcpCriterionMatch';
import { formatIcpNumericBandLabel } from '@/icp-analysis/utils/formatIcpNumericBandLabel';
import { isIcpAttributeValueKnown } from '@/icp-analysis/utils/isIcpAttributeValueKnown';
import { assertUnreachable, isDefined } from '@/utils';

type IcpBucketDefinition = {
  key: string;
  label: string;
  match: IcpCriterionMatch;
};

const countByValue = (values: string[]): Map<string, number> =>
  values.reduce(
    (countsByValue, value) =>
      countsByValue.set(value, (countsByValue.get(value) ?? 0) + 1),
    new Map<string, number>(),
  );

const buildCategoryBucketDefinitions = (
  attribute: IcpAttributeDefinition,
  rows: IcpDatasetRow[],
): IcpBucketDefinition[] => {
  const categoryValues = rows.flatMap((row) => {
    const value = row.values[attribute.key];

    if (Array.isArray(value)) {
      return [...new Set(value)];
    }

    return typeof value === 'string' ? [value] : [];
  });

  return [...countByValue(categoryValues).entries()]
    .sort(
      ([firstValue, firstCount], [secondValue, secondCount]) =>
        secondCount - firstCount || firstValue.localeCompare(secondValue),
    )
    .map(([value]) => ({
      key: `${attribute.key}:in:${value}`,
      label: attribute.valueLabels?.[value] ?? value,
      match: { type: 'IN', values: [value] },
    }));
};

const buildNumericBucketDefinitions = (
  attribute: IcpAttributeDefinition,
  rows: IcpDatasetRow[],
): IcpBucketDefinition[] => {
  const bands =
    attribute.bands ??
    bucketIcpNumericValues({
      values: rows.flatMap((row) => {
        const value = row.values[attribute.key];

        return typeof value === 'number' ? [value] : [];
      }),
    });

  return bands
    .filter(({ min, max }) => isDefined(min) || isDefined(max))
    .map((band) => ({
      key: `${attribute.key}:between:${band.min ?? ''}:${band.max ?? ''}`,
      label: formatIcpNumericBandLabel(band),
      match: { type: 'BETWEEN', min: band.min, max: band.max },
    }));
};

const buildBooleanBucketDefinitions = (
  attribute: IcpAttributeDefinition,
): IcpBucketDefinition[] =>
  [true, false].map((value) => ({
    key: `${attribute.key}:is:${value}`,
    label: attribute.valueLabels?.[String(value)] ?? String(value),
    match: { type: 'IS', value },
  }));

const buildBucketDefinitions = (
  attribute: IcpAttributeDefinition,
  rows: IcpDatasetRow[],
): IcpBucketDefinition[] => {
  switch (attribute.valueType) {
    case 'CATEGORY':
    case 'CATEGORY_LIST':
      return buildCategoryBucketDefinitions(attribute, rows);
    case 'NUMBER':
      return buildNumericBucketDefinitions(attribute, rows);
    case 'BOOLEAN':
      return buildBooleanBucketDefinitions(attribute);
    default:
      return assertUnreachable(attribute.valueType);
  }
};

const computeDirection = ({
  interval,
  baselineWinRate,
  totalCount,
}: {
  interval: { lower: number; upper: number };
  baselineWinRate: number;
  totalCount: number;
}): IcpPatternDirection => {
  if (totalCount === 0) {
    return 'NEUTRAL';
  }

  if (interval.lower > baselineWinRate) {
    return 'POSITIVE';
  }

  if (interval.upper < baselineWinRate) {
    return 'NEGATIVE';
  }

  return 'NEUTRAL';
};

const countLostReasons = (rows: IcpDatasetRow[]): Record<string, number> =>
  Object.fromEntries(
    countByValue(
      rows.flatMap(({ outcome, lostReason }) =>
        outcome === 'LOST' && isDefined(lostReason) ? [lostReason] : [],
      ),
    ),
  );

const computeAttributePatterns = ({
  attribute,
  rows,
  baselineWinRate,
  smoothedBaselineWinRate,
}: {
  attribute: IcpAttributeDefinition;
  rows: IcpDatasetRow[];
  baselineWinRate: number;
  smoothedBaselineWinRate: number;
}): IcpAttributePatterns => {
  const knownRows = rows.filter((row) =>
    isIcpAttributeValueKnown(row.values[attribute.key]),
  );

  const buckets = buildBucketDefinitions(attribute, knownRows).map(
    (bucketDefinition): IcpPatternBucket => {
      const bucketRows = knownRows.filter((row) =>
        doesIcpCriterionMatch(
          bucketDefinition.match,
          row.values[attribute.key],
        ),
      );
      const wonCount = bucketRows.filter(
        ({ outcome }) => outcome === 'WON',
      ).length;
      const totalCount = bucketRows.length;
      // Laplace smoothing keeps a bucket with one won deal from reading 100%.
      const winRate = (wonCount + 1) / (totalCount + 2);
      const interval = computeWilsonScoreInterval({
        successCount: wonCount,
        totalCount,
      });

      return {
        ...bucketDefinition,
        attributeKey: attribute.key,
        wonCount,
        lostCount: totalCount - wonCount,
        totalCount,
        winRate,
        lift: winRate / smoothedBaselineWinRate,
        interval,
        direction: computeDirection({ interval, baselineWinRate, totalCount }),
        isLowSample: totalCount < ICP_MIN_BUCKET_SAMPLE_SIZE,
        lostReasonCounts: countLostReasons(bucketRows),
      };
    },
  );

  return {
    attributeKey: attribute.key,
    label: attribute.label,
    category: attribute.category,
    valueType: attribute.valueType,
    knownCount: knownRows.length,
    coverage:
      rows.length > 0 ? Math.round((100 * knownRows.length) / rows.length) : 0,
    buckets,
  };
};

export const computeIcpAttributePatterns = ({
  rows,
  attributes,
}: {
  rows: IcpDatasetRow[];
  attributes: IcpAttributeDefinition[];
}): IcpPatternAnalysis => {
  const wonCount = rows.filter(({ outcome }) => outcome === 'WON').length;
  const lostCount = rows.length - wonCount;
  const baselineWinRate = rows.length > 0 ? wonCount / rows.length : 0;
  const smoothedBaselineWinRate = (wonCount + 1) / (rows.length + 2);

  return {
    totalCount: rows.length,
    wonCount,
    lostCount,
    baselineWinRate,
    isSampleSizeSufficient:
      wonCount >= ICP_SUFFICIENT_SAMPLE_SIZE_PER_OUTCOME &&
      lostCount >= ICP_SUFFICIENT_SAMPLE_SIZE_PER_OUTCOME,
    attributes: attributes.map((attribute) =>
      computeAttributePatterns({
        attribute,
        rows,
        baselineWinRate,
        smoothedBaselineWinRate,
      }),
    ),
  };
};
