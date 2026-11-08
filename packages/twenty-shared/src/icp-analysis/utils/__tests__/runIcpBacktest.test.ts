import { DEFAULT_ICP_TIER_THRESHOLDS } from '@/icp-analysis/constants/DefaultIcpTierThresholds';
import { type IcpCriterion } from '@/icp-analysis/types/IcpCriterion';
import { type IcpDatasetRow } from '@/icp-analysis/types/IcpDatasetRow';
import { computeAreaUnderRocCurve } from '@/icp-analysis/utils/computeAreaUnderRocCurve';
import { evaluateIcpModel } from '@/icp-analysis/utils/evaluateIcpModel';
import { runIcpBacktest } from '@/icp-analysis/utils/runIcpBacktest';
import { splitIcpDatasetByClosedAt } from '@/icp-analysis/utils/splitIcpDatasetByClosedAt';
import {
  buildIcpTestDataset,
  ICP_TEST_ATTRIBUTES,
} from '@/icp-analysis/utils/__tests__/icpTestDataset';

const INDUSTRY_CRITERIA: IcpCriterion[] = [
  {
    id: 'fintech',
    attributeKey: 'industry',
    attributeLabel: 'Industry',
    label: 'Industry: Fintech',
    category: 'FIRMOGRAPHIC',
    match: { type: 'IN', values: ['FINTECH'] },
    weight: 20,
    isHardExclusion: false,
  },
  {
    id: 'retail',
    attributeKey: 'industry',
    attributeLabel: 'Industry',
    label: 'Industry: Retail',
    category: 'FIRMOGRAPHIC',
    match: { type: 'IN', values: ['RETAIL'] },
    weight: -20,
    isHardExclusion: false,
  },
];

describe('computeAreaUnderRocCurve', () => {
  it.each([
    [
      'perfect separation',
      [
        { score: 90, isPositive: true },
        { score: 10, isPositive: false },
      ],
      1,
    ],
    [
      'inverted ranking',
      [
        { score: 10, isPositive: true },
        { score: 90, isPositive: false },
      ],
      0,
    ],
    [
      'identical scores',
      [
        { score: 50, isPositive: true },
        { score: 50, isPositive: false },
      ],
      0.5,
    ],
    [
      'a partly correct ranking',
      [
        { score: 3, isPositive: true },
        { score: 1, isPositive: true },
        { score: 2, isPositive: false },
        { score: 0, isPositive: false },
      ],
      0.75,
    ],
  ])('reads %s', (_, scoredRows, expectedAuc) => {
    expect(computeAreaUnderRocCurve(scoredRows)).toBeCloseTo(expectedAuc);
  });

  it('is undefined with a single outcome', () => {
    expect(
      computeAreaUnderRocCurve([{ score: 90, isPositive: true }]),
    ).toBeNull();
  });
});

describe('evaluateIcpModel', () => {
  const evaluation = evaluateIcpModel({
    criteria: INDUSTRY_CRITERIA,
    thresholds: DEFAULT_ICP_TIER_THRESHOLDS,
    rows: buildIcpTestDataset(),
  });

  it('summarises win rate and lift per tier', () => {
    expect(evaluation.tiers).toEqual([
      {
        tier: 'PRIORITY',
        totalCount: 20,
        wonCount: 16,
        lostCount: 4,
        winRate: 0.8,
        lift: expect.closeTo(0.8 / (29 / 60)),
      },
      {
        tier: 'TARGET',
        totalCount: 0,
        wonCount: 0,
        lostCount: 0,
        winRate: null,
        lift: null,
      },
      {
        tier: 'NURTURE',
        totalCount: 0,
        wonCount: 0,
        lostCount: 0,
        winRate: null,
        lift: null,
      },
      {
        tier: 'EXCLUDED',
        totalCount: 40,
        wonCount: 13,
        lostCount: 27,
        winRate: 13 / 40,
        lift: expect.closeTo(13 / 40 / (29 / 60)),
      },
    ]);
  });

  it('measures how well scores separate won from lost deals', () => {
    expect(evaluation.auc).toBeCloseTo(
      (16 * 27 + 0.5 * (16 * 4 + 13 * 27)) / (29 * 31),
    );
    expect(evaluation.doesPriorityBeatBaseline).toBe(true);
    expect(evaluation.isAucBelowActivationThreshold).toBe(false);
  });

  it('lists the deals the model got wrong', () => {
    expect(evaluation.wonBelowTarget).toHaveLength(13);
    expect(evaluation.lostInPriority).toHaveLength(4);
    expect(
      evaluation.lostInPriority.every(
        ({ outcome, tier }) => outcome === 'LOST' && tier === 'PRIORITY',
      ),
    ).toBe(true);
  });
});

describe('splitIcpDatasetByClosedAt', () => {
  const buildRow = (id: string, closedAt: string): IcpDatasetRow => ({
    id,
    outcome: 'WON',
    closedAt,
    values: {},
  });

  it('trains on the oldest 70% and tests on the newest deals', () => {
    const rows = Array.from({ length: 10 }, (_, index) =>
      buildRow(
        `deal-${index}`,
        new Date(Date.UTC(2026, 0, 10 - index)).toISOString(),
      ),
    );

    const { trainingRows, testRows } = splitIcpDatasetByClosedAt({ rows });

    expect(trainingRows.map(({ id }) => id)).toEqual([
      'deal-9',
      'deal-8',
      'deal-7',
      'deal-6',
      'deal-5',
      'deal-4',
      'deal-3',
    ]);
    expect(testRows.map(({ id }) => id)).toEqual([
      'deal-2',
      'deal-1',
      'deal-0',
    ]);
  });

  it('breaks ties by id and treats unreadable dates as oldest', () => {
    const { trainingRows, testRows } = splitIcpDatasetByClosedAt({
      rows: [
        buildRow('b', '2026-02-01T00:00:00.000Z'),
        buildRow('a', '2026-02-01T00:00:00.000Z'),
        buildRow('broken', 'not a date'),
      ],
      trainingShare: 0.5,
    });

    expect(trainingRows.map(({ id }) => id)).toEqual(['broken', 'a']);
    expect(testRows.map(({ id }) => id)).toEqual(['b']);
  });
});

describe('runIcpBacktest', () => {
  it('scores the history in sample and re-suggests weights for a holdout on the newest deals', () => {
    const result = runIcpBacktest({
      criteria: INDUSTRY_CRITERIA,
      thresholds: DEFAULT_ICP_TIER_THRESHOLDS,
      rows: buildIcpTestDataset(),
      attributes: ICP_TEST_ATTRIBUTES,
    });

    expect(result.inSample.totalCount).toBe(60);
    expect(result.holdout).toMatchObject({ trainingCount: 42, testCount: 18 });
    expect(result.holdout?.evaluation.totalCount).toBe(18);
    expect(
      result.holdout?.criteria.find(({ id }) => id === 'industry:in:FINTECH')
        ?.weight,
    ).toBeGreaterThan(0);
    expect(result.comparison).toBeNull();
  });

  it('skips the holdout below 40 deals', () => {
    const result = runIcpBacktest({
      criteria: INDUSTRY_CRITERIA,
      thresholds: DEFAULT_ICP_TIER_THRESHOLDS,
      rows: buildIcpTestDataset().slice(0, 39),
      attributes: ICP_TEST_ATTRIBUTES,
    });

    expect(result.holdout).toBeNull();
  });

  it('skips the holdout when the newest deals all share one outcome', () => {
    const rows = buildIcpTestDataset().map(
      (row, index): IcpDatasetRow =>
        index >= 42 ? { ...row, outcome: 'WON' } : row,
    );

    const result = runIcpBacktest({
      criteria: INDUSTRY_CRITERIA,
      thresholds: DEFAULT_ICP_TIER_THRESHOLDS,
      rows,
      attributes: ICP_TEST_ATTRIBUTES,
    });

    expect(result.holdout).toBeNull();
  });

  it('describes how companies that never had a deal would score', () => {
    const result = runIcpBacktest({
      criteria: INDUSTRY_CRITERIA,
      thresholds: DEFAULT_ICP_TIER_THRESHOLDS,
      rows: buildIcpTestDataset(),
      attributes: ICP_TEST_ATTRIBUTES,
      comparisonValuesList: [
        { industry: 'FINTECH' },
        { industry: 'RETAIL' },
        { industry: 'HEALTH' },
        {},
      ],
    });

    expect(result.comparison).toEqual({
      totalCount: 4,
      medianScore: 0,
      tierCounts: { PRIORITY: 1, TARGET: 0, NURTURE: 0, EXCLUDED: 3 },
    });
  });
});
