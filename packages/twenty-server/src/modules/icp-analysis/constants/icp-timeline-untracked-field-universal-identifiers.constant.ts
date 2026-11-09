import { STANDARD_OBJECTS } from 'twenty-shared/metadata';

import { ICP_SCORE_FIELD_UNIVERSAL_IDENTIFIERS } from 'src/modules/icp-analysis/constants/icp-score-field-universal-identifiers.constant';

// Written by jobs and actions rather than people: score fields change on every
// rescore, and analysis and back-test snapshots are large JSON documents.
export const ICP_TIMELINE_UNTRACKED_FIELD_UNIVERSAL_IDENTIFIERS =
  new Set<string>([
    ...ICP_SCORE_FIELD_UNIVERSAL_IDENTIFIERS,
    STANDARD_OBJECTS.icpModel.fields.analysis.universalIdentifier,
    STANDARD_OBJECTS.icpModel.fields.backtest.universalIdentifier,
  ]);
