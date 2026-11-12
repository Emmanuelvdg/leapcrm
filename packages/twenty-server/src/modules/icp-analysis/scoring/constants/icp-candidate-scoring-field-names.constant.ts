// The candidate fields a score depends on: the matched company and the
// firmographics used when there is no match.
export const ICP_CANDIDATE_SCORING_FIELD_NAMES = new Set([
  'matchedCompanyId',
  'country',
  'employeeCount',
]);
