import { describe, expect, it } from 'vitest';

import { computeDealHealth } from 'src/utils/compute-deal-health';

const NOW = new Date('2026-10-04T12:00:00.000Z');
const SETTINGS = { stalledAfterDays: 21, closedStages: ['CUSTOMER'] };

const daysAgo = (days: number): string =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const daysFromNow = (days: number): string => daysAgo(-days);

describe('computeDealHealth', () => {
  it('is healthy with a future close date, recent stage change and an open task', () => {
    expect(
      computeDealHealth(
        {
          stage: 'PROPOSAL',
          closeDate: daysFromNow(10),
          stageChangedAt: daysAgo(3),
          openTaskCount: 1,
        },
        SETTINGS,
        NOW,
      ),
    ).toEqual({ healthStatus: 'HEALTHY', healthReasons: null });
  });

  it('clears health for closed deals', () => {
    expect(
      computeDealHealth(
        {
          stage: 'CUSTOMER',
          closeDate: daysAgo(40),
          stageChangedAt: daysAgo(40),
          openTaskCount: 0,
        },
        SETTINGS,
        NOW,
      ),
    ).toEqual({ healthStatus: null, healthReasons: null });
  });

  it('is at risk when the close date has passed', () => {
    expect(
      computeDealHealth(
        {
          stage: 'MEETING',
          closeDate: daysAgo(12),
          stageChangedAt: daysAgo(2),
          openTaskCount: 1,
        },
        SETTINGS,
        NOW,
      ),
    ).toEqual({
      healthStatus: 'AT_RISK',
      healthReasons: 'Close date passed (22 Sep 2026)',
    });
  });

  it('is at risk when stalled with no open task', () => {
    expect(
      computeDealHealth(
        {
          stage: 'SCREENING',
          closeDate: daysFromNow(30),
          stageChangedAt: daysAgo(34),
          openTaskCount: 0,
        },
        SETTINGS,
        NOW,
      ),
    ).toEqual({
      healthStatus: 'AT_RISK',
      healthReasons: 'In this stage since 31 Aug 2026 · No open task',
    });
  });

  it('only needs watching when stalled but a next step is planned', () => {
    expect(
      computeDealHealth(
        {
          stage: 'SCREENING',
          closeDate: daysFromNow(30),
          stageChangedAt: daysAgo(25),
          openTaskCount: 2,
        },
        SETTINGS,
        NOW,
      ),
    ).toEqual({
      healthStatus: 'WATCH',
      healthReasons: 'In this stage since 9 Sep 2026',
    });
  });

  it('needs watching when there is no close date or open task', () => {
    expect(
      computeDealHealth(
        {
          stage: 'NEW',
          closeDate: null,
          stageChangedAt: daysAgo(1),
          openTaskCount: 0,
        },
        SETTINGS,
        NOW,
      ),
    ).toEqual({
      healthStatus: 'WATCH',
      healthReasons: 'No close date · No open task',
    });
  });

  it('does not flag a close date of today as overdue', () => {
    expect(
      computeDealHealth(
        {
          stage: 'PROPOSAL',
          closeDate: daysAgo(0.5),
          stageChangedAt: daysAgo(1),
          openTaskCount: 1,
        },
        SETTINGS,
        NOW,
      ).healthStatus,
    ).toBe('HEALTHY');
  });

  it('keeps the same reasons from one day to the next', () => {
    const input = {
      stage: 'SCREENING',
      closeDate: daysAgo(3),
      stageChangedAt: daysAgo(30),
      openTaskCount: 0,
    };
    const tomorrow = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);

    expect(computeDealHealth(input, SETTINGS, tomorrow)).toEqual(
      computeDealHealth(input, SETTINGS, NOW),
    );
  });

  it('respects a custom stall threshold', () => {
    expect(
      computeDealHealth(
        {
          stage: 'MEETING',
          closeDate: daysFromNow(5),
          stageChangedAt: daysAgo(8),
          openTaskCount: 1,
        },
        { ...SETTINGS, stalledAfterDays: 7 },
        NOW,
      ),
    ).toEqual({
      healthStatus: 'WATCH',
      healthReasons: 'In this stage since 26 Sep 2026',
    });
  });
});
