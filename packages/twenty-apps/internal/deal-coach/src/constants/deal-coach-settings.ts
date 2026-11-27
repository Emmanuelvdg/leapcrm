export const CLOSED_STAGES_VARIABLE_NAME = 'CLOSED_STAGES';
export const REFRESH_AFTER_DAYS_VARIABLE_NAME = 'REFRESH_AFTER_DAYS';
export const MAX_DEALS_PER_RUN_VARIABLE_NAME = 'MAX_DEALS_PER_RUN';

export const DEFAULT_CLOSED_STAGES = ['CUSTOMER', 'LOST'];
export const DEFAULT_REFRESH_AFTER_DAYS = 3;
export const DEFAULT_MAX_DEALS_PER_RUN = 25;

export const NEW_ACTIVITY_CRON_PATTERN = '*/15 * * * *';
// The window overlaps several runs so a deal skipped by the per-run cap is
// picked up by a later run while its activity is still inside the window.
export const NEW_ACTIVITY_LOOKBACK_MINUTES = 60;
// Mailbox and WhatsApp history imports create old messages in bulk; only
// recent ones say anything about what the rep should do next.
export const MAX_MESSAGE_AGE_FOR_REFRESH_HOURS = 48;

export const NIGHTLY_REFRESH_CRON_PATTERN = '0 4 * * *';
