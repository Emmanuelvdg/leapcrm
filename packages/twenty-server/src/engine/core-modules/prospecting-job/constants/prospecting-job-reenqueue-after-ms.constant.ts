// A due job still pending this long after it should have been delivered lost
// its queue message (Redis restart, failed enqueue, or a claim refused by the
// per-workspace cap) and is enqueued again by the reconciler.
export const PROSPECTING_JOB_REENQUEUE_AFTER_MS = 2 * 60 * 1000;
