import {
  DEFAULT_ICP_TIER_THRESHOLDS,
  type IcpCriterion,
  type IcpDatasetRow,
  runIcpBacktest,
} from 'twenty-shared/icp-analysis';

import { getIcpActivationWarnings } from '@/icp-analysis/utils/getIcpActivationWarnings';

const FINTECH_CRITERION: IcpCriterion = {
  id: 'industry:in:FINTECH',
  attributeKey: 'industry',
  attributeLabel: 'Industry',
  label: 'Industry: Fintech',
  category: 'FIRMOGRAPHIC',
  match: { type: 'IN', values: ['FINTECH'] },
  weight: 20,
  isHardExclusion: false,
};

const buildRows = (
  deals: { outcome: IcpDatasetRow['outcome']; industry: string }[],
): IcpDatasetRow[] =>
  deals.map(({ outcome, industry }, index) => ({
    id: `deal-${index}`,
    outcome,
    closedAt: '2026-03-01T00:00:00.000Z',
    values: { industry },
  }));

const backtestFor = (rows: IcpDatasetRow[]) =>
  runIcpBacktest({
    criteria: [FINTECH_CRITERION],
    thresholds: DEFAULT_ICP_TIER_THRESHOLDS,
    rows,
    attributes: [
      {
        key: 'industry',
        label: 'Industry',
        category: 'FIRMOGRAPHIC',
        valueType: 'CATEGORY',
      },
    ],
  });

describe('getIcpActivationWarnings', () => {
  it('has nothing to warn about when Priority wins more and separates well', () => {
    const backtest = backtestFor(
      buildRows([
        { outcome: 'WON', industry: 'FINTECH' },
        { outcome: 'WON', industry: 'FINTECH' },
        { outcome: 'LOST', industry: 'RETAIL' },
        { outcome: 'LOST', industry: 'RETAIL' },
      ]),
    );

    expect(getIcpActivationWarnings(backtest)).toEqual([]);
  });

  it('warns when the criteria favour the deals that were lost', () => {
    const backtest = backtestFor(
      buildRows([
        { outcome: 'LOST', industry: 'FINTECH' },
        { outcome: 'LOST', industry: 'FINTECH' },
        { outcome: 'WON', industry: 'RETAIL' },
        { outcome: 'WON', industry: 'RETAIL' },
      ]),
    );

    expect(getIcpActivationWarnings(backtest)).toEqual([
      'PRIORITY_NOT_ABOVE_BASELINE',
      'WEAK_SEPARATION',
    ]);
  });

  it('has nothing to say before the deals are loaded', () => {
    expect(getIcpActivationWarnings(null)).toEqual([]);
  });
});
