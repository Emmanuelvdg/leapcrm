// Delayed queue messages are timed by the worker clock and nextRunAt by the
// database clock; a small tolerance stops minor skew from refusing the claim.
export const PROSPECTING_JOB_CLAIM_CLOCK_TOLERANCE_MS = 5 * 1000;
