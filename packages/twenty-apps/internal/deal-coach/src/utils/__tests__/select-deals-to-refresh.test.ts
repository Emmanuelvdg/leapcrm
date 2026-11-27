import { describe, expect, it } from 'vitest';

import { type DealCoachSettings } from 'src/utils/get-deal-coach-settings';
import {
  type ActivitySignal,
  type CandidateDeal,
  hasStageOrCloseDateChange,
  isRecentEnough,
  selectDealsToRefresh,
} from 'src/utils/select-deals-to-refresh';

const SETTINGS: DealCoachSettings = {
  closedStages: ['CUSTOMER', 'LOST'],
  refreshAfterDays: 3,
  maxDealsPerRun: 25,
};

const buildDeal = (overrides: Partial<CandidateDeal> = {}): CandidateDeal => ({
  id: 'deal-1',
  stage: 'MEETING',
  pointOfContactId: 'person-1',
  companyId: 'company-1',
  nextBestActionUpdatedAt: '2026-11-24T08:00:00.000Z',
  ...overrides,
});

const buildSignal = (
  overrides: Partial<ActivitySignal> = {},
): ActivitySignal => ({
  opportunityId: null,
  personId: null,
  companyId: null,
  at: '2026-11-24T09:00:00.000Z',
  canCloseDeal: false,
  ...overrides,
});

describe('selectDealsToRefresh', () => {
  it('picks deals whose contact, company or record had newer activity', () => {
    const deals = [
      buildDeal({ id: 'by-person' }),
      buildDeal({ id: 'by-company', pointOfContactId: 'person-2' }),
      buildDeal({
        id: 'by-id',
        pointOfContactId: 'person-3',
        companyId: 'company-3',
      }),
      buildDeal({
        id: 'unrelated',
        pointOfContactId: 'person-4',
        companyId: 'company-4',
      }),
    ];

    const selectedIds = selectDealsToRefresh({
      signals: [
        buildSignal({ personId: 'person-1' }),
        buildSignal({ companyId: 'company-1' }),
        buildSignal({ opportunityId: 'by-id' }),
      ],
      deals,
      settings: SETTINGS,
    });

    expect(selectedIds.sort()).toEqual(['by-company', 'by-id', 'by-person']);
  });

  it('skips deals already refreshed after the activity', () => {
    const selectedIds = selectDealsToRefresh({
      signals: [buildSignal({ personId: 'person-1' })],
      deals: [
        buildDeal({ nextBestActionUpdatedAt: '2026-11-24T09:30:00.000Z' }),
      ],
      settings: SETTINGS,
    });

    expect(selectedIds).toEqual([]);
  });

  it('always picks open deals that never had a suggestion', () => {
    const selectedIds = selectDealsToRefresh({
      signals: [buildSignal({ personId: 'person-1' })],
      deals: [buildDeal({ nextBestActionUpdatedAt: null })],
      settings: SETTINGS,
    });

    expect(selectedIds).toEqual(['deal-1']);
  });

  it('ignores messages on closed deals', () => {
    const selectedIds = selectDealsToRefresh({
      signals: [buildSignal({ personId: 'person-1' })],
      deals: [buildDeal({ stage: 'CUSTOMER' })],
      settings: SETTINGS,
    });

    expect(selectedIds).toEqual([]);
  });

  it('picks a deal that was just closed so its suggestion gets cleared', () => {
    const selectedIds = selectDealsToRefresh({
      signals: [buildSignal({ opportunityId: 'deal-1', canCloseDeal: true })],
      deals: [buildDeal({ stage: 'LOST' })],
      settings: SETTINGS,
    });

    expect(selectedIds).toEqual(['deal-1']);
  });

  it('does not pick a closed deal with nothing to clear', () => {
    const selectedIds = selectDealsToRefresh({
      signals: [buildSignal({ opportunityId: 'deal-1', canCloseDeal: true })],
      deals: [buildDeal({ stage: 'LOST', nextBestActionUpdatedAt: null })],
      settings: SETTINGS,
    });

    expect(selectedIds).toEqual([]);
  });

  it('caps the run and starts with the oldest activity', () => {
    const deals = Array.from({ length: 5 }, (_, index) =>
      buildDeal({
        id: `deal-${index}`,
        pointOfContactId: `person-${index}`,
        companyId: null,
      }),
    );
    const signals = deals.map((deal, index) =>
      buildSignal({
        personId: deal.pointOfContactId,
        at: `2026-11-24T1${5 - index}:00:00.000Z`,
      }),
    );

    const selectedIds = selectDealsToRefresh({
      signals,
      deals,
      settings: { ...SETTINGS, maxDealsPerRun: 2 },
    });

    expect(selectedIds).toEqual(['deal-4', 'deal-3']);
  });
});

describe('isRecentEnough', () => {
  const now = new Date('2026-11-24T12:00:00.000Z');

  it('accepts messages inside the window and rejects older or missing ones', () => {
    expect(
      isRecentEnough({ at: '2026-11-23T13:00:00.000Z', now, maxAgeHours: 48 }),
    ).toBe(true);
    expect(
      isRecentEnough({ at: '2026-11-20T13:00:00.000Z', now, maxAgeHours: 48 }),
    ).toBe(false);
    expect(isRecentEnough({ at: null, now, maxAgeHours: 48 })).toBe(false);
  });
});

describe('hasStageOrCloseDateChange', () => {
  it('detects stage and close date changes in a timeline diff', () => {
    expect(
      hasStageOrCloseDateChange({
        diff: { stage: { before: 'NEW', after: 'MEETING' } },
      }),
    ).toBe(true);
    expect(
      hasStageOrCloseDateChange({
        diff: { closeDate: { before: null, after: '2026-12-01' } },
      }),
    ).toBe(true);
    expect(
      hasStageOrCloseDateChange({
        diff: { nextBestAction: { before: null, after: 'Call Priya' } },
      }),
    ).toBe(false);
    expect(hasStageOrCloseDateChange(null)).toBe(false);
  });
});
