import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { type IcpPatternBucket } from 'twenty-shared/icp-analysis';

import { IcpPatternTable } from '@/icp-analysis/components/IcpPatternTable';

const buildBucket = (bucket: Partial<IcpPatternBucket>): IcpPatternBucket => ({
  key: 'industry:in:FINTECH',
  attributeKey: 'industry',
  label: 'Fintech',
  match: { type: 'IN', values: ['FINTECH'] },
  wonCount: 16,
  lostCount: 4,
  totalCount: 20,
  winRate: 0.77,
  lift: 1.6,
  interval: { lower: 0.58, upper: 0.92 },
  direction: 'POSITIVE',
  isLowSample: false,
  lostReasonCounts: {},
  ...bucket,
});

const BUCKETS: IcpPatternBucket[] = [
  buildBucket({}),
  buildBucket({
    key: 'industry:in:RETAIL',
    label: 'Retail',
    wonCount: 3,
    lostCount: 17,
    winRate: 0.18,
    lift: 0.4,
    direction: 'NEGATIVE',
  }),
  buildBucket({
    key: 'industry:in:INSURANCE',
    label: 'Insurance',
    wonCount: 0,
    lostCount: 1,
    totalCount: 1,
    winRate: 0.33,
    lift: 1.2,
    direction: 'NEUTRAL',
    isLowSample: true,
  }),
];

const renderWithI18n = (node: ReactNode) =>
  render(<I18nProvider i18n={i18n}>{node}</I18nProvider>);

describe('IcpPatternTable', () => {
  it('shows counts, plain win rates against the average and a signal for each value', () => {
    renderWithI18n(
      <IcpPatternTable
        buckets={BUCKETS}
        baselineWinRate={0.5}
        addedBucketKeys={[]}
      />,
    );

    const [, fintechRow, retailRow, insuranceRow] = screen.getAllByRole('row');

    expect(fintechRow).toHaveTextContent('FintechWinning162080%1.6x');
    expect(retailRow).toHaveTextContent('RetailLosing32015%0.3x');
    expect(insuranceRow).toHaveTextContent('InsuranceToo few deals010%0.0x');
  });

  it('adds a value to the model unless it is already in it or has too few deals', async () => {
    const onAddBucket = jest.fn();

    renderWithI18n(
      <IcpPatternTable
        buckets={BUCKETS}
        baselineWinRate={0.5}
        addedBucketKeys={['industry:in:RETAIL']}
        onAddBucket={onAddBucket}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Add Fintech to the model' }),
    );

    expect(onAddBucket).toHaveBeenCalledWith(BUCKETS[0]);
    expect(
      screen.queryByRole('button', { name: 'Add Retail to the model' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add Insurance to the model' }),
    ).not.toBeInTheDocument();
  });
});
