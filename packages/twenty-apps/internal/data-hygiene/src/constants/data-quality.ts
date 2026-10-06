export const DATA_QUALITY = {
  CLEAN: 'CLEAN',
  INCOMPLETE: 'INCOMPLETE',
  POSSIBLE_DUPLICATE: 'POSSIBLE_DUPLICATE',
} as const;

export type DataQuality = (typeof DATA_QUALITY)[keyof typeof DATA_QUALITY];

export const ISSUE_SEPARATOR = ' · ';

export const NIGHTLY_SCAN_CRON_PATTERN = '30 4 * * *';
