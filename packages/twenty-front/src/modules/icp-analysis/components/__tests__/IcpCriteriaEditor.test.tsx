import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { type IcpCriterion } from 'twenty-shared/icp-analysis';

import { IcpCriteriaEditor } from '@/icp-analysis/components/IcpCriteriaEditor';

const buildCriterion = (criterion: Partial<IcpCriterion>): IcpCriterion => ({
  id: 'industry:in:FINTECH',
  attributeKey: 'industry',
  attributeLabel: 'Industry',
  label: 'Industry: Fintech',
  category: 'FIRMOGRAPHIC',
  match: { type: 'IN', values: ['FINTECH'] },
  weight: 20,
  isHardExclusion: false,
  ...criterion,
});

const CRITERIA: IcpCriterion[] = [
  buildCriterion({}),
  buildCriterion({
    id: 'industry:in:RETAIL',
    label: 'Industry: Retail',
    match: { type: 'IN', values: ['RETAIL'] },
    weight: -20,
  }),
  buildCriterion({
    id: 'visitedPricing:is:true',
    attributeKey: 'visitedPricing',
    attributeLabel: 'Visited pricing',
    label: 'Visited pricing: Yes',
    category: 'INTENT',
    match: { type: 'IS', value: true },
    weight: 25,
  }),
];

const renderEditor = ({ isEditable = true } = {}) => {
  const onChange = jest.fn();

  const EditorWithState = () => {
    const [criteria, setCriteria] = useState(CRITERIA);

    return (
      <IcpCriteriaEditor
        criteria={criteria}
        isEditable={isEditable}
        onChange={(nextCriteria) => {
          setCriteria(nextCriteria);
          onChange(nextCriteria);
        }}
      />
    );
  };

  render(
    <I18nProvider i18n={i18n}>
      <EditorWithState />
    </I18nProvider>,
  );

  return { onChange };
};

const getLastCriteria = (onChange: jest.Mock): IcpCriterion[] =>
  onChange.mock.calls[onChange.mock.calls.length - 1][0];

describe('IcpCriteriaEditor', () => {
  // jsdom has no PointerEvent, which base-ui's checkbox creates on click.
  beforeAll(() => {
    if (!('PointerEvent' in window)) {
      Object.defineProperty(window, 'PointerEvent', {
        value: MouseEvent,
        configurable: true,
        writable: true,
      });
    }
  });

  it('groups criteria by category with the points each category uses', () => {
    renderEditor();

    expect(screen.getByText('Firmographic')).toBeInTheDocument();
    expect(screen.getByText('20 of 35 points')).toBeInTheDocument();
    expect(screen.getByText('Intent')).toBeInTheDocument();
    expect(screen.getByText('25 of 30 points')).toBeInTheDocument();
  });

  it('changes a weight and keeps it within the allowed range', async () => {
    const { onChange } = renderEditor();
    const weightInput = screen.getByRole('spinbutton', {
      name: 'Weight for Industry: Fintech',
    });

    await userEvent.clear(weightInput);
    await userEvent.type(weightInput, '90');

    expect(weightInput).toHaveValue(35);
    expect(getLastCriteria(onChange)[0].weight).toBe(35);
  });

  it('only lets a criterion that removes points exclude companies', async () => {
    const { onChange } = renderEditor();

    expect(
      screen.getByRole('checkbox', {
        name: 'Always exclude Industry: Fintech',
      }),
    ).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Always exclude Industry: Retail' }),
    );

    expect(getLastCriteria(onChange)[1].isHardExclusion).toBe(true);
  });

  it('removes a criterion', async () => {
    const { onChange } = renderEditor();

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Visited pricing: Yes' }),
    );

    expect(getLastCriteria(onChange).map(({ id }) => id)).toEqual([
      'industry:in:FINTECH',
      'industry:in:RETAIL',
    ]);
    expect(screen.queryByText('Intent')).not.toBeInTheDocument();
  });

  it('is read-only for an active or archived model', () => {
    renderEditor({ isEditable: false });

    expect(
      screen.getByRole('spinbutton', { name: 'Weight for Industry: Fintech' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Remove Industry: Fintech' }),
    ).toBeDisabled();
  });
});
