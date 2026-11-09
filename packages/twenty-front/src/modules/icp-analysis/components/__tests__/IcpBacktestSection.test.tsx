import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  DEFAULT_ICP_TIER_THRESHOLDS,
  evaluateIcpModel,
  type IcpDatasetRow,
} from 'twenty-shared/icp-analysis';

import { IcpBacktestSection } from '@/icp-analysis/components/IcpBacktestSection';

const buildRow = (
  row: Pick<IcpDatasetRow, 'id' | 'name' | 'outcome'> & { industry: string },
): IcpDatasetRow => ({
  id: row.id,
  name: row.name,
  outcome: row.outcome,
  closedAt: '2026-03-01T00:00:00.000Z',
  values: { industry: row.industry },
});

describe('IcpBacktestSection', () => {
  it('links the deals the criteria got wrong by name', () => {
    const inSample = evaluateIcpModel({
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
        buildRow({
          id: 'won-retail',
          name: 'Globex rollout',
          outcome: 'WON',
          industry: 'RETAIL',
        }),
        buildRow({
          id: 'lost-fintech',
          name: null,
          outcome: 'LOST',
          industry: 'FINTECH',
        }),
        buildRow({
          id: 'won-fintech',
          name: 'Acme expansion',
          outcome: 'WON',
          industry: 'FINTECH',
        }),
      ],
    });

    render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <IcpBacktestSection
            backtest={{ inSample, holdout: null, comparison: null }}
            hasAnalysis
          />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      screen.getByRole('link', { name: 'Globex rollout, scored 0' }),
    ).toHaveAttribute('href', '/object/opportunity/won-retail');
    expect(
      screen.getByRole('link', { name: 'Untitled deal, scored 100' }),
    ).toHaveAttribute('href', '/object/opportunity/lost-fintech');
    expect(
      screen.queryByRole('link', { name: /Acme expansion/ }),
    ).not.toBeInTheDocument();
  });
});
