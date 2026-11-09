import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import {
  DEFAULT_ICP_TIER_THRESHOLDS,
  evaluateIcpModel,
  type IcpDatasetRow,
} from 'twenty-shared/icp-analysis';

import { IcpBacktestTierTable } from '@/icp-analysis/components/IcpBacktestTierTable';

const buildRow = (
  id: string,
  outcome: IcpDatasetRow['outcome'],
  industry: string,
): IcpDatasetRow => ({
  id,
  outcome,
  closedAt: '2026-03-01T00:00:00.000Z',
  values: { industry },
});

describe('IcpBacktestTierTable', () => {
  it('shows deals, wins and win rate for every tier', () => {
    const evaluation = evaluateIcpModel({
      criteria: [
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
      ],
      thresholds: DEFAULT_ICP_TIER_THRESHOLDS,
      rows: [
        buildRow('a', 'WON', 'FINTECH'),
        buildRow('b', 'WON', 'FINTECH'),
        buildRow('c', 'LOST', 'FINTECH'),
        buildRow('d', 'LOST', 'RETAIL'),
      ],
    });

    render(
      <I18nProvider i18n={i18n}>
        <IcpBacktestTierTable evaluation={evaluation} />
      </I18nProvider>,
    );

    const rows = screen.getAllByRole('row');

    expect(rows.map((row) => row.textContent)).toEqual([
      'TierDealsWonLostWin rateLift',
      'Priority32167%1.3x',
      'Target000--',
      'Nurture000--',
      'Excluded1010%0.0x',
    ]);
  });
});
