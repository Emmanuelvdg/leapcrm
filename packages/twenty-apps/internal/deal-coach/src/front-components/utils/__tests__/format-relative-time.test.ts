import { describe, expect, it } from 'vitest';

import { formatRelativeTime } from 'src/front-components/utils/format-relative-time';

const NOW = new Date('2026-11-24T12:00:00.000Z');

describe('formatRelativeTime', () => {
  it.each([
    ['2026-11-24T11:59:40.000Z', 'just now'],
    ['2026-11-24T11:48:00.000Z', '12 min ago'],
    ['2026-11-24T11:00:00.000Z', '1 hour ago'],
    ['2026-11-24T07:00:00.000Z', '5 hours ago'],
    ['2026-11-23T11:00:00.000Z', 'yesterday'],
    ['2026-11-20T12:00:00.000Z', '4 days ago'],
    ['not a date', ''],
  ])('formats %s as "%s"', (isoDate, expected) => {
    expect(formatRelativeTime(isoDate, NOW)).toBe(expected);
  });
});
