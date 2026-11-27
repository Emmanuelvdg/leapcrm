import { describe, expect, it } from 'vitest';

import { describeDealUpdate } from 'src/utils/describe-deal-update';
import { getMeetingBoundaries } from 'src/utils/meeting-times';

describe('describeDealUpdate', () => {
  it('lists each suggested change', () => {
    expect(
      describeDealUpdate(
        {
          stage: 'MEETING',
          stageLabel: 'Meeting',
          closeDate: '2027-01-15',
          amountMicros: 2_600_000_000_000,
        },
        'USD',
      ),
    ).toEqual([
      'Stage → Meeting',
      'Close date → 2027-01-15',
      'Amount → $2,600,000',
    ]);
  });

  it('leaves out what does not change', () => {
    expect(
      describeDealUpdate(
        {
          stage: null,
          stageLabel: null,
          closeDate: '2027-01-15',
          amountMicros: null,
        },
        null,
      ),
    ).toEqual(['Close date → 2027-01-15']);
  });
});

describe('getMeetingBoundaries', () => {
  it('ends the meeting after its duration', () => {
    const boundaries = getMeetingBoundaries({
      title: 'Site visit',
      startLocal: '2026-11-26T11:00',
      durationMinutes: 60,
      location: null,
    });

    expect(boundaries).toBeDefined();
    expect(
      Date.parse(boundaries?.endsAt ?? '') -
        Date.parse(boundaries?.startsAt ?? ''),
    ).toBe(60 * 60 * 1000);
    expect(boundaries?.startsAt).toBe(
      new Date('2026-11-26T11:00').toISOString(),
    );
  });

  it('returns undefined for an unreadable time', () => {
    expect(
      getMeetingBoundaries({
        title: 'Site visit',
        startLocal: 'soon',
        durationMinutes: 30,
        location: null,
      }),
    ).toBeUndefined();
  });
});
