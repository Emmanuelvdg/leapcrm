import { STANDARD_OBJECTS } from 'twenty-shared/metadata';

import { ICP_SCORE_FIELD_NAMES } from 'src/modules/icp-analysis/constants/icp-score-field-names.constant';

export const ICP_SCORE_FIELD_UNIVERSAL_IDENTIFIERS = new Set<string>(
  ICP_SCORE_FIELD_NAMES.flatMap((fieldName) => [
    STANDARD_OBJECTS.company.fields[fieldName].universalIdentifier,
    STANDARD_OBJECTS.prospectCandidate.fields[fieldName].universalIdentifier,
  ]),
);
