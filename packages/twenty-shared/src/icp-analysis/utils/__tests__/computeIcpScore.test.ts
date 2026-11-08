import { DEFAULT_ICP_TIER_THRESHOLDS } from '@/icp-analysis/constants/DefaultIcpTierThresholds';
import { type IcpCriterion } from '@/icp-analysis/types/IcpCriterion';
import { computeIcpScore } from '@/icp-analysis/utils/computeIcpScore';
import { computeIcpTier } from '@/icp-analysis/utils/computeIcpTier';

const buildCriterion = (
  criterion: Pick<
    IcpCriterion,
    'id' | 'attributeKey' | 'attributeLabel' | 'match' | 'weight'
  > &
    Partial<IcpCriterion>,
): IcpCriterion => ({
  label: criterion.id,
  category: 'FIRMOGRAPHIC',
  isHardExclusion: false,
  ...criterion,
});

// Maximum score is 70: industry 20 + employees 15 + pricing 25 + tech stack 10.
const CRITERIA: IcpCriterion[] = [
  buildCriterion({
    id: 'fintech',
    attributeKey: 'industry',
    attributeLabel: 'Industry',
    label: 'Industry: Fintech',
    match: { type: 'IN', values: ['FINTECH'] },
    weight: 20,
  }),
  buildCriterion({
    id: 'insurance',
    attributeKey: 'industry',
    attributeLabel: 'Industry',
    label: 'Industry: Insurance',
    match: { type: 'IN', values: ['INSURANCE'] },
    weight: 10,
  }),
  buildCriterion({
    id: 'mid-size',
    attributeKey: 'employees',
    attributeLabel: 'Employees',
    label: 'Employees: 50-200',
    match: { type: 'BETWEEN', min: 50, max: 200 },
    weight: 15,
  }),
  buildCriterion({
    id: 'pricing',
    attributeKey: 'visitedPricing',
    attributeLabel: 'Visited pricing',
    label: 'Visited pricing: Yes',
    category: 'INTENT',
    match: { type: 'IS', value: true },
    weight: 25,
  }),
  buildCriterion({
    id: 'salesforce',
    attributeKey: 'techStack',
    attributeLabel: 'Tech stack',
    label: 'Tech stack: Salesforce',
    category: 'TECHNOGRAPHIC',
    match: { type: 'IN', values: ['SALESFORCE'] },
    weight: 10,
  }),
  buildCriterion({
    id: 'competitor',
    attributeKey: 'techStack',
    attributeLabel: 'Tech stack',
    label: 'Tech stack: Competitor X',
    category: 'TECHNOGRAPHIC',
    match: { type: 'IN', values: ['COMPETITOR_X'] },
    weight: -20,
  }),
];

const score = (values: Record<string, unknown>, criteria = CRITERIA) =>
  computeIcpScore({
    criteria,
    values: values as Parameters<typeof computeIcpScore>[0]['values'],
    thresholds: DEFAULT_ICP_TIER_THRESHOLDS,
  });

describe('computeIcpScore', () => {
  it('gives a full fit 100 and lists the matched criteria by weight', () => {
    const result = score({
      industry: 'FINTECH',
      employees: 120,
      visitedPricing: true,
      techStack: ['SALESFORCE'],
    });

    expect(result).toMatchObject({
      score: 100,
      tier: 'PRIORITY',
      coverage: 100,
      isHardExcluded: false,
    });
    expect(
      result.reasons.map(
        (reason) => reason.type === 'MATCH' && reason.criterionId,
      ),
    ).toEqual(['pricing', 'fintech', 'mid-size', 'salesforce']);
  });

  it('scores a partial fit against the maximum and tiers it', () => {
    const result = score({
      industry: 'FINTECH',
      employees: 120,
      visitedPricing: false,
      techStack: ['SLACK'],
    });

    expect(result.score).toBe(50);
    expect(result.tier).toBe('NURTURE');
  });

  it('counts the lower weight when a weaker category value matches', () => {
    const result = score({
      industry: 'INSURANCE',
      employees: 120,
      visitedPricing: true,
      techStack: ['SALESFORCE'],
    });

    expect(result.score).toBe(86);
    expect(result.tier).toBe('PRIORITY');
  });

  it('adds nothing for unknown values, lowers coverage and names the biggest gaps', () => {
    const result = score({
      industry: 'FINTECH',
      employees: null,
      techStack: [],
    });

    expect(result.score).toBe(29);
    expect(result.coverage).toBe(22);
    expect(
      result.reasons.filter((reason) => reason.type === 'UNKNOWN'),
    ).toEqual([
      {
        type: 'UNKNOWN',
        attributeKey: 'visitedPricing',
        attributeLabel: 'Visited pricing',
        weight: 25,
      },
      {
        type: 'UNKNOWN',
        attributeKey: 'employees',
        attributeLabel: 'Employees',
        weight: 15,
      },
    ]);
  });

  it('subtracts a matched negative criterion and never goes below 0', () => {
    expect(
      score({
        industry: 'FINTECH',
        employees: 120,
        visitedPricing: true,
        techStack: ['SALESFORCE', 'COMPETITOR_X'],
      }).score,
    ).toBe(71);

    expect(
      score({
        industry: 'RETAIL',
        employees: 10,
        visitedPricing: false,
        techStack: ['COMPETITOR_X'],
      }),
    ).toMatchObject({ score: 0, tier: 'EXCLUDED' });
  });

  it('counts only the best positive criterion per attribute when several match', () => {
    const result = score({ employees: 120 }, [
      buildCriterion({
        id: 'mid-size',
        attributeKey: 'employees',
        attributeLabel: 'Employees',
        match: { type: 'BETWEEN', min: 50, max: 200 },
        weight: 15,
      }),
      buildCriterion({
        id: 'under-500',
        attributeKey: 'employees',
        attributeLabel: 'Employees',
        match: { type: 'BETWEEN', min: null, max: 500 },
        weight: 5,
      }),
    ]);

    expect(result.score).toBe(100);
    expect(result.reasons).toHaveLength(1);
  });

  it('excludes a hard-excluded company whatever its score and reports why first', () => {
    const result = score(
      {
        industry: 'FINTECH',
        employees: 120,
        visitedPricing: true,
        techStack: ['SALESFORCE', 'CRYPTO_EXCHANGE'],
      },
      [
        ...CRITERIA,
        buildCriterion({
          id: 'crypto',
          attributeKey: 'techStack',
          attributeLabel: 'Tech stack',
          label: 'Tech stack: Crypto exchange',
          category: 'TECHNOGRAPHIC',
          match: { type: 'IN', values: ['CRYPTO_EXCHANGE'] },
          weight: 0,
          isHardExclusion: true,
        }),
      ],
    );

    expect(result).toMatchObject({
      score: 100,
      tier: 'EXCLUDED',
      isHardExcluded: true,
    });
    expect(result.reasons[0]).toMatchObject({
      type: 'MATCH',
      criterionId: 'crypto',
      isHardExclusion: true,
    });
  });

  it('returns an empty result without criteria', () => {
    expect(score({ industry: 'FINTECH' }, [])).toEqual({
      score: 0,
      tier: 'EXCLUDED',
      coverage: 0,
      isHardExcluded: false,
      reasons: [],
    });
  });
});

describe('computeIcpTier', () => {
  it.each([
    [80, 'PRIORITY'],
    [79, 'TARGET'],
    [60, 'TARGET'],
    [59, 'NURTURE'],
    [40, 'NURTURE'],
    [39, 'EXCLUDED'],
  ])('puts a score of %i in %s', (scoreValue, expectedTier) => {
    expect(
      computeIcpTier({
        score: scoreValue,
        thresholds: DEFAULT_ICP_TIER_THRESHOLDS,
        isHardExcluded: false,
      }),
    ).toBe(expectedTier);
  });
});
