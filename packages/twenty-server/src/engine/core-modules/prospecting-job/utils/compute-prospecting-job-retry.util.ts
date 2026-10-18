import {
  PROSPECTING_JOB_BACKOFF_BASE_DELAY_MS,
  PROSPECTING_JOB_BACKOFF_MAX_DELAY_MS,
} from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-backoff.constant';

export type ProspectingJobRetryDecision =
  | { status: 'PENDING'; nextRunAt: Date }
  | { status: 'DEAD' | 'FAILED' };

export const computeProspectingJobRetry = ({
  attempts,
  maxAttempts,
  isRetryable,
  now,
  random = Math.random,
}: {
  attempts: number;
  maxAttempts: number;
  isRetryable: boolean;
  now: Date;
  random?: () => number;
}): ProspectingJobRetryDecision => {
  if (!isRetryable) {
    return { status: 'FAILED' };
  }

  if (attempts >= maxAttempts) {
    return { status: 'DEAD' };
  }

  const exponentialDelay = Math.min(
    PROSPECTING_JOB_BACKOFF_MAX_DELAY_MS,
    PROSPECTING_JOB_BACKOFF_BASE_DELAY_MS * 2 ** Math.max(attempts - 1, 0),
  );

  // Half fixed, half random: keeps a minimum wait while spreading out jobs
  // that failed together, for example during a provider outage.
  const delay = exponentialDelay / 2 + random() * (exponentialDelay / 2);

  return {
    status: 'PENDING',
    nextRunAt: new Date(now.getTime() + Math.round(delay)),
  };
};
