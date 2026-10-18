import {
  PROSPECTING_JOB_BACKOFF_BASE_DELAY_MS,
  PROSPECTING_JOB_BACKOFF_MAX_DELAY_MS,
} from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-backoff.constant';
import { computeProspectingJobRetry } from 'src/engine/core-modules/prospecting-job/utils/compute-prospecting-job-retry.util';

const NOW = new Date('2026-10-18T10:00:00.000Z');

const getDelayMs = (
  decision: ReturnType<typeof computeProspectingJobRetry>,
) => {
  if (decision.status !== 'PENDING') {
    throw new Error(`Expected a retry, got ${decision.status}`);
  }

  return decision.nextRunAt.getTime() - NOW.getTime();
};

describe('computeProspectingJobRetry', () => {
  it('fails permanently when the error is not retryable', () => {
    expect(
      computeProspectingJobRetry({
        attempts: 1,
        maxAttempts: 5,
        isRetryable: false,
        now: NOW,
      }),
    ).toEqual({ status: 'FAILED' });
  });

  it('marks the job dead once the last attempt has failed', () => {
    expect(
      computeProspectingJobRetry({
        attempts: 5,
        maxAttempts: 5,
        isRetryable: true,
        now: NOW,
      }),
    ).toEqual({ status: 'DEAD' });
  });

  it('doubles the delay with each attempt', () => {
    const delays = [1, 2, 3].map((attempts) =>
      getDelayMs(
        computeProspectingJobRetry({
          attempts,
          maxAttempts: 10,
          isRetryable: true,
          now: NOW,
          random: () => 1,
        }),
      ),
    );

    expect(delays).toEqual([
      PROSPECTING_JOB_BACKOFF_BASE_DELAY_MS,
      PROSPECTING_JOB_BACKOFF_BASE_DELAY_MS * 2,
      PROSPECTING_JOB_BACKOFF_BASE_DELAY_MS * 4,
    ]);
  });

  it('never waits less than half the delay, whatever the jitter', () => {
    const delay = getDelayMs(
      computeProspectingJobRetry({
        attempts: 1,
        maxAttempts: 5,
        isRetryable: true,
        now: NOW,
        random: () => 0,
      }),
    );

    expect(delay).toBe(PROSPECTING_JOB_BACKOFF_BASE_DELAY_MS / 2);
  });

  it('caps the delay', () => {
    const delay = getDelayMs(
      computeProspectingJobRetry({
        attempts: 30,
        maxAttempts: 40,
        isRetryable: true,
        now: NOW,
        random: () => 1,
      }),
    );

    expect(delay).toBe(PROSPECTING_JOB_BACKOFF_MAX_DELAY_MS);
  });
});
