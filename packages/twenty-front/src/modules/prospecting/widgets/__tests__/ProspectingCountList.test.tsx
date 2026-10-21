import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { ProspectingCountList } from '@/prospecting/widgets/ProspectingCountList';

const LIFECYCLE_STAGE_OPTIONS = [
  {
    id: '1',
    value: 'DISCOVERED',
    label: 'Discovered',
    color: 'blue',
    position: 0,
  },
  {
    id: '2',
    value: 'HUMAN_REVIEW',
    label: 'Human review',
    color: 'orange',
    position: 1,
  },
  {
    id: '3',
    value: 'DISQUALIFIED',
    label: 'Disqualified',
    color: 'red',
    position: 2,
  },
] as const;

const renderWithI18n = (node: ReactNode) =>
  render(<I18nProvider i18n={i18n}>{node}</I18nProvider>);

describe('ProspectingCountList', () => {
  it('lists the counts in pipeline order and hides empty stages', () => {
    renderWithI18n(
      <ProspectingCountList
        title="By stage"
        options={[...LIFECYCLE_STAGE_OPTIONS]}
        groups={[
          { groupByDimensionValues: ['HUMAN_REVIEW'], totalCount: 2 },
          { groupByDimensionValues: ['DISCOVERED'], totalCount: 14 },
        ]}
      />,
    );

    const labels = screen
      .getAllByText(/Discovered|Human review|Disqualified/)
      .map((element) => element.textContent);

    expect(labels).toEqual(['Discovered', 'Human review']);
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('says when there are no candidates yet', () => {
    renderWithI18n(
      <ProspectingCountList
        title="By stage"
        options={[...LIFECYCLE_STAGE_OPTIONS]}
        groups={[]}
      />,
    );

    expect(screen.getByText('No candidates yet')).toBeInTheDocument();
  });

  it('counts candidates without a value separately', () => {
    renderWithI18n(
      <ProspectingCountList
        title="By CRM match"
        options={[]}
        groups={[{ groupByDimensionValues: [null], totalCount: 3 }]}
      />,
    );

    expect(screen.getByText('Not set')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
