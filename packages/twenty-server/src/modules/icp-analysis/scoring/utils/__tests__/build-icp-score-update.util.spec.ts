import { type IcpScoreResult } from 'twenty-shared/icp-analysis';

import { buildIcpScoreUpdate } from 'src/modules/icp-analysis/scoring/utils/build-icp-score-update.util';

const SCORED_AT = new Date('2026-11-11T03:00:00.000Z');

const RESULT: IcpScoreResult = {
  score: 85,
  tier: 'PRIORITY',
  coverage: 60,
  isHardExcluded: false,
  reasons: [
    {
      type: 'MATCH',
      criterionId: 'industry:in:FINTECH',
      label: 'Industry: Fintech',
      weight: 20,
      isHardExclusion: false,
    },
    {
      type: 'MATCH',
      criterionId: 'industry:in:RETAIL',
      label: 'Uses Competitor X',
      weight: -10,
      isHardExclusion: false,
    },
    {
      type: 'UNKNOWN',
      attributeKey: 'employees',
      attributeLabel: 'Employees',
      weight: 15,
    },
  ],
};

const REASONS_TEXT =
  'Industry: Fintech (+20) · Uses Competitor X (-10) · Employees unknown';

describe('buildIcpScoreUpdate', () => {
  it('writes the score, tier, reasons, coverage and model version', () => {
    expect(
      buildIcpScoreUpdate({
        current: {
          icpScore: null,
          icpTier: null,
          icpScoreReasons: null,
          icpCoverage: null,
          icpModelVersion: null,
        },
        result: RESULT,
        modelVersion: 3,
        scoredAt: SCORED_AT,
      }),
    ).toEqual({
      icpScore: 85,
      icpTier: 'PRIORITY',
      icpScoreReasons: REASONS_TEXT,
      icpCoverage: 60,
      icpModelVersion: 3,
      icpScoredAt: SCORED_AT,
    });
  });

  it('leaves an unchanged score alone, even when the scored date is older', () => {
    expect(
      buildIcpScoreUpdate({
        current: {
          icpScore: 85,
          icpTier: 'PRIORITY',
          icpScoreReasons: REASONS_TEXT,
          icpCoverage: 60,
          icpModelVersion: 3,
        },
        result: RESULT,
        modelVersion: 3,
        scoredAt: SCORED_AT,
      }),
    ).toBeNull();
  });

  it('treats reasons stored as an empty string like no reasons', () => {
    expect(
      buildIcpScoreUpdate({
        current: {
          icpScore: 0,
          icpTier: 'EXCLUDED',
          icpScoreReasons: '',
          icpCoverage: 0,
          icpModelVersion: 1,
        },
        result: {
          score: 0,
          tier: 'EXCLUDED',
          coverage: 0,
          isHardExcluded: false,
          reasons: [],
        },
        modelVersion: 1,
        scoredAt: SCORED_AT,
      }),
    ).toBeNull();
  });

  it('rescores when a new model version is active', () => {
    expect(
      buildIcpScoreUpdate({
        current: {
          icpScore: 85,
          icpTier: 'PRIORITY',
          icpScoreReasons: REASONS_TEXT,
          icpCoverage: 60,
          icpModelVersion: 2,
        },
        result: RESULT,
        modelVersion: 3,
        scoredAt: SCORED_AT,
      }),
    ).toMatchObject({ icpModelVersion: 3 });
  });

  it('shows a hard exclusion as excluded instead of a weight', () => {
    expect(
      buildIcpScoreUpdate({
        current: {
          icpScore: null,
          icpTier: null,
          icpScoreReasons: null,
          icpCoverage: null,
          icpModelVersion: null,
        },
        result: {
          ...RESULT,
          tier: 'EXCLUDED',
          reasons: [
            {
              type: 'MATCH',
              criterionId: 'country:in:XX',
              label: 'Country: Sanctioned',
              weight: 0,
              isHardExclusion: true,
            },
          ],
        },
        modelVersion: 1,
        scoredAt: SCORED_AT,
      }),
    ).toMatchObject({ icpScoreReasons: 'Country: Sanctioned (excluded)' });
  });
});
