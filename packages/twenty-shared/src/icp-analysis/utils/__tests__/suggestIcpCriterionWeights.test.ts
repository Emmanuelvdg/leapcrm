import { ICP_CRITERION_MAX_WEIGHT } from '@/icp-analysis/constants/IcpCriterionMaxWeight';
import { ICP_CRITERION_MIN_WEIGHT } from '@/icp-analysis/constants/IcpCriterionMinWeight';
import { icpCriteriaSchema } from '@/icp-analysis/schemas/icp-criterion-schema';
import { type IcpAttributeCategory } from '@/icp-analysis/types/IcpAttributeCategory';
import {
  type IcpAttributePatterns,
  type IcpPatternAnalysis,
  type IcpPatternBucket,
} from '@/icp-analysis/types/IcpPatternAnalysis';
import { computeIcpAttributePatterns } from '@/icp-analysis/utils/computeIcpAttributePatterns';
import { suggestIcpCriterionWeights } from '@/icp-analysis/utils/suggestIcpCriterionWeights';
import {
  buildIcpTestDataset,
  ICP_TEST_ATTRIBUTES,
} from '@/icp-analysis/utils/__tests__/icpTestDataset';

const buildBucket = ({
  attributeKey,
  value,
  wonCount,
  lostCount,
}: {
  attributeKey: string;
  value: string;
  wonCount: number;
  lostCount: number;
}): IcpPatternBucket => {
  const totalCount = wonCount + lostCount;

  return {
    key: `${attributeKey}:in:${value}`,
    attributeKey,
    label: value,
    match: { type: 'IN', values: [value] },
    wonCount,
    lostCount,
    totalCount,
    winRate: (wonCount + 1) / (totalCount + 2),
    lift: 1,
    interval: { lower: 0, upper: 1 },
    direction: 'NEUTRAL',
    isLowSample: totalCount < 5,
    lostReasonCounts: {},
  };
};

const buildAttribute = ({
  attributeKey,
  category = 'FIRMOGRAPHIC',
  buckets,
}: {
  attributeKey: string;
  category?: IcpAttributeCategory;
  buckets: IcpPatternBucket[];
}): IcpAttributePatterns => ({
  attributeKey,
  label: attributeKey,
  category,
  valueType: 'CATEGORY',
  knownCount: 100,
  coverage: 100,
  buckets,
});

const buildAnalysis = (
  attributes: IcpAttributePatterns[],
): IcpPatternAnalysis => ({
  totalCount: 100,
  wonCount: 50,
  lostCount: 50,
  baselineWinRate: 0.5,
  isSampleSizeSufficient: true,
  attributes,
});

describe('suggestIcpCriterionWeights', () => {
  const suggestedCriteria = suggestIcpCriterionWeights({
    analysis: computeIcpAttributePatterns({
      rows: buildIcpTestDataset(),
      attributes: ICP_TEST_ATTRIBUTES,
    }),
  });

  const findCriterion = (id: string) =>
    suggestedCriteria.find((criterion) => criterion.id === id);

  it('rewards the winning segment and penalises the losing one', () => {
    expect(findCriterion('industry:in:FINTECH')).toEqual({
      id: 'industry:in:FINTECH',
      attributeKey: 'industry',
      attributeLabel: 'Industry',
      label: 'Industry: Fintech',
      category: 'FIRMOGRAPHIC',
      match: { type: 'IN', values: ['FINTECH'] },
      weight: 15,
      isHardExclusion: false,
    });
    expect(findCriterion('industry:in:RETAIL')?.weight).toBe(-20);
    expect(findCriterion('techStack:in:SALESFORCE')?.weight).toBe(15);
  });

  it('leaves out values that do not move the win rate', () => {
    expect(findCriterion('industry:in:HEALTH')).toBeUndefined();
    expect(findCriterion('techStack:in:SLACK')).toBeUndefined();
  });

  it('produces criteria the schema accepts, in steps of five', () => {
    expect(icpCriteriaSchema.safeParse(suggestedCriteria).success).toBe(true);
    expect(
      suggestedCriteria.every(
        ({ weight }) =>
          weight % 5 === 0 &&
          weight !== 0 &&
          weight >= ICP_CRITERION_MIN_WEIGHT &&
          weight <= ICP_CRITERION_MAX_WEIGHT,
      ),
    ).toBe(true);
  });

  it('orders criteria from highest to lowest weight', () => {
    const weights = suggestedCriteria.map(({ weight }) => weight);

    expect(weights).toEqual(
      [...weights].sort((first, second) => second - first),
    );
  });

  it('keeps a category within its cap when several attributes are strong', () => {
    const criteria = suggestIcpCriterionWeights({
      analysis: buildAnalysis(
        ['industry', 'employees', 'country'].map((attributeKey) =>
          buildAttribute({
            attributeKey,
            buckets: [
              buildBucket({
                attributeKey,
                value: 'STRONG',
                wonCount: 40,
                lostCount: 2,
              }),
            ],
          }),
        ),
      ),
    });

    expect(criteria.map(({ weight }) => weight)).toEqual([10, 10, 10]);
  });

  it('caps a strong negative signal at the minimum weight', () => {
    const criteria = suggestIcpCriterionWeights({
      analysis: buildAnalysis([
        buildAttribute({
          attributeKey: 'industry',
          buckets: [
            buildBucket({
              attributeKey: 'industry',
              value: 'GAMBLING',
              wonCount: 0,
              lostCount: 60,
            }),
          ],
        }),
      ]),
    });

    expect(criteria.map(({ weight }) => weight)).toEqual([
      ICP_CRITERION_MIN_WEIGHT,
    ]);
  });

  it('never suggests a low-sample bucket', () => {
    const criteria = suggestIcpCriterionWeights({
      analysis: buildAnalysis([
        buildAttribute({
          attributeKey: 'industry',
          buckets: [
            buildBucket({
              attributeKey: 'industry',
              value: 'RARE',
              wonCount: 4,
              lostCount: 0,
            }),
          ],
        }),
      ]),
    });

    expect(criteria).toEqual([]);
  });

  it('keeps at most three values per attribute and respects the overall limit', () => {
    const industry = buildAttribute({
      attributeKey: 'industry',
      buckets: ['A', 'B', 'C', 'D', 'E'].map((value) =>
        buildBucket({
          attributeKey: 'industry',
          value,
          wonCount: 30,
          lostCount: 5,
        }),
      ),
    });
    const intent = buildAttribute({
      attributeKey: 'pricingVisits',
      category: 'INTENT',
      buckets: [
        buildBucket({
          attributeKey: 'pricingVisits',
          value: 'MANY',
          wonCount: 30,
          lostCount: 2,
        }),
      ],
    });

    const perAttributeLimited = suggestIcpCriterionWeights({
      analysis: buildAnalysis([industry, intent]),
    });

    expect(
      perAttributeLimited.filter(
        ({ attributeKey }) => attributeKey === 'industry',
      ),
    ).toHaveLength(3);

    const overallLimited = suggestIcpCriterionWeights({
      analysis: buildAnalysis([industry, intent]),
      maxCriteriaCount: 2,
    });

    expect(overallLimited).toHaveLength(2);
    expect(overallLimited[0].attributeKey).toBe('pricingVisits');
  });
});
