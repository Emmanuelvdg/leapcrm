import { STANDARD_OBJECTS } from 'twenty-shared/metadata';

const ICP_SCORE_FIELD_NAMES = [
  'icpScore',
  'icpTier',
  'icpScoreReasons',
  'icpCoverage',
  'icpModelVersion',
  'icpScoredAt',
] as const;

export const ICP_SCORE_FIELD_UNIVERSAL_IDENTIFIERS = new Set<string>(
  ICP_SCORE_FIELD_NAMES.flatMap((fieldName) => [
    STANDARD_OBJECTS.company.fields[fieldName].universalIdentifier,
    STANDARD_OBJECTS.prospectCandidate.fields[fieldName].universalIdentifier,
  ]),
);
