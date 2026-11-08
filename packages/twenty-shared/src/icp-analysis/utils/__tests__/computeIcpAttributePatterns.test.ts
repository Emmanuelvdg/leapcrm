import { type IcpDatasetRow } from '@/icp-analysis/types/IcpDatasetRow';
import { type IcpPatternAnalysis } from '@/icp-analysis/types/IcpPatternAnalysis';
import { computeIcpAttributePatterns } from '@/icp-analysis/utils/computeIcpAttributePatterns';
import { computeWilsonScoreInterval } from '@/icp-analysis/utils/computeWilsonScoreInterval';
import {
  buildIcpTestDataset,
  ICP_TEST_ATTRIBUTES,
} from '@/icp-analysis/utils/__tests__/icpTestDataset';

const getAttribute = (analysis: IcpPatternAnalysis, attributeKey: string) => {
  const attribute = analysis.attributes.find(
    (candidate) => candidate.attributeKey === attributeKey,
  );

  if (attribute === undefined) {
    throw new Error(`Missing attribute ${attributeKey}`);
  }

  return attribute;
};

const getBucket = (
  analysis: IcpPatternAnalysis,
  attributeKey: string,
  bucketLabel: string,
) => {
  const bucket = getAttribute(analysis, attributeKey).buckets.find(
    ({ label }) => label === bucketLabel,
  );

  if (bucket === undefined) {
    throw new Error(`Missing bucket ${attributeKey} ${bucketLabel}`);
  }

  return bucket;
};

describe('computeIcpAttributePatterns', () => {
  const analysis = computeIcpAttributePatterns({
    rows: buildIcpTestDataset(),
    attributes: ICP_TEST_ATTRIBUTES,
  });

  it('computes the baseline over every deal', () => {
    expect(analysis).toMatchObject({
      totalCount: 60,
      wonCount: 29,
      lostCount: 31,
      isSampleSizeSufficient: true,
    });
    expect(analysis.baselineWinRate).toBeCloseTo(29 / 60);
  });

  it('separates winning, losing and neutral category values', () => {
    const fintech = getBucket(analysis, 'industry', 'Fintech');
    const retail = getBucket(analysis, 'industry', 'Retail');
    const health = getBucket(analysis, 'industry', 'Health');

    expect(fintech).toMatchObject({
      key: 'industry:in:FINTECH',
      match: { type: 'IN', values: ['FINTECH'] },
      wonCount: 16,
      lostCount: 4,
      direction: 'POSITIVE',
      isLowSample: false,
      lostReasonCounts: { COMPETITOR: 4 },
    });
    expect(fintech.winRate).toBeCloseTo(17 / 22);
    expect(fintech.lift).toBeCloseTo(17 / 22 / (30 / 62));

    expect(retail).toMatchObject({
      wonCount: 3,
      lostCount: 17,
      direction: 'NEGATIVE',
      lostReasonCounts: { PRICE: 17 },
    });
    expect(health).toMatchObject({
      wonCount: 10,
      lostCount: 10,
      direction: 'NEUTRAL',
    });
  });

  it('labels numeric bands and counts each deal in its band', () => {
    const employeeBuckets = getAttribute(analysis, 'employees').buckets;

    expect(employeeBuckets.map(({ label }) => label)).toEqual([
      '< 50',
      '50-200',
      '200+',
    ]);
    expect(
      employeeBuckets.reduce((total, { totalCount }) => total + totalCount, 0),
    ).toBe(60);
  });

  it('counts a multi-select deal in every value it has', () => {
    expect(getBucket(analysis, 'techStack', 'SLACK').totalCount).toBe(60);
    expect(getBucket(analysis, 'techStack', 'SALESFORCE')).toMatchObject({
      wonCount: 16,
      lostCount: 4,
    });
  });

  it('reports how many deals have a value for each attribute', () => {
    expect(getAttribute(analysis, 'visitedPricing')).toMatchObject({
      knownCount: 45,
      coverage: 75,
    });
    expect(
      getAttribute(analysis, 'visitedPricing').buckets.map(
        ({ label }) => label,
      ),
    ).toEqual(['Yes', 'No']);
  });

  it('flags buckets with fewer than five deals as low sample', () => {
    const rows: IcpDatasetRow[] = [
      ...buildIcpTestDataset(),
      ...['a', 'b', 'c'].map(
        (suffix): IcpDatasetRow => ({
          id: `insurance-${suffix}`,
          outcome: 'WON',
          closedAt: '2026-06-01T00:00:00.000Z',
          values: { industry: 'INSURANCE' },
        }),
      ),
    ];

    const insurance = getBucket(
      computeIcpAttributePatterns({ rows, attributes: ICP_TEST_ATTRIBUTES }),
      'industry',
      'INSURANCE',
    );

    expect(insurance).toMatchObject({ totalCount: 3, isLowSample: true });
  });

  it('computes numeric bands from the data when none are given', () => {
    const employeeBuckets = getAttribute(
      computeIcpAttributePatterns({
        rows: buildIcpTestDataset(),
        attributes: [
          {
            key: 'employees',
            label: 'Employees',
            category: 'FIRMOGRAPHIC',
            valueType: 'NUMBER',
          },
        ],
      }),
      'employees',
    ).buckets;

    expect(employeeBuckets.map(({ label }) => label)).toEqual([
      '< 120',
      '120-500',
      '500+',
    ]);
  });

  it.each(['WON', 'LOST'] as const)(
    'keeps every bucket neutral when all deals were %s',
    (outcome) => {
      const singleOutcomeAnalysis = computeIcpAttributePatterns({
        rows: buildIcpTestDataset().map(
          (row): IcpDatasetRow => ({ ...row, outcome }),
        ),
        attributes: ICP_TEST_ATTRIBUTES,
      });

      expect(singleOutcomeAnalysis.isSampleSizeSufficient).toBe(false);
      expect(
        singleOutcomeAnalysis.attributes
          .flatMap(({ buckets }) => buckets)
          .every(({ direction }) => direction === 'NEUTRAL'),
      ).toBe(true);
    },
  );

  it('handles an empty dataset', () => {
    const emptyAnalysis = computeIcpAttributePatterns({
      rows: [],
      attributes: ICP_TEST_ATTRIBUTES,
    });

    expect(emptyAnalysis).toMatchObject({
      totalCount: 0,
      baselineWinRate: 0,
      isSampleSizeSufficient: false,
    });
    expect(getAttribute(emptyAnalysis, 'industry')).toMatchObject({
      coverage: 0,
      buckets: [],
    });
  });
});

describe('computeWilsonScoreInterval', () => {
  it('returns the full range without data', () => {
    expect(
      computeWilsonScoreInterval({ successCount: 0, totalCount: 0 }),
    ).toEqual({ lower: 0, upper: 1 });
  });

  it('computes the 95% interval', () => {
    const interval = computeWilsonScoreInterval({
      successCount: 16,
      totalCount: 20,
    });

    expect(interval.lower).toBeCloseTo(0.584, 3);
    expect(interval.upper).toBeCloseTo(0.919, 3);
  });

  it('reaches exactly 0 and 1 at the extremes', () => {
    expect(
      computeWilsonScoreInterval({ successCount: 7, totalCount: 7 }).upper,
    ).toBe(1);
    expect(
      computeWilsonScoreInterval({ successCount: 0, totalCount: 7 }).lower,
    ).toBe(0);
  });
});
