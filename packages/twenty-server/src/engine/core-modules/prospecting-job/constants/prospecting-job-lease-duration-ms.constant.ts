// Well above the slowest provider call so a healthy run is never reclaimed
// while it is still working.
export const PROSPECTING_JOB_LEASE_DURATION_MS = 15 * 60 * 1000;
