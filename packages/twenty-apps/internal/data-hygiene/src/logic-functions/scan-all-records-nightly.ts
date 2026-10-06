import { defineLogicFunction } from 'twenty-sdk/define';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { NIGHTLY_SCAN_CRON_PATTERN } from 'src/constants/data-quality';
import { NIGHTLY_SCAN_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { scanAllRecords } from 'src/utils/scan-all-records';

const handler = async (): Promise<object> =>
  scanAllRecords(new CoreApiClient());

// Saves only check the records around the one that changed, and merges or
// deletes can leave stale flags behind, so everything is reconciled daily.
export default defineLogicFunction({
  universalIdentifier: NIGHTLY_SCAN_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'scan-all-records-nightly',
  description:
    'Rechecks every person and company for duplicates and missing details once a day.',
  timeoutSeconds: 300,
  cronTriggerSettings: {
    pattern: NIGHTLY_SCAN_CRON_PATTERN,
  },
  handler,
});
