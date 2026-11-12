import { ICP_SCORE_FIELD_NAMES } from 'src/modules/icp-analysis/constants/icp-score-field-names.constant';

// Changing only these never changes a score. Score writes touch exactly these,
// so ignoring them keeps a rescore from triggering another one.
export const ICP_COMPANY_BOOKKEEPING_FIELD_NAMES = new Set<string>([
  ...ICP_SCORE_FIELD_NAMES,
  'updatedAt',
  'updatedBy',
  'position',
  'searchVector',
]);
