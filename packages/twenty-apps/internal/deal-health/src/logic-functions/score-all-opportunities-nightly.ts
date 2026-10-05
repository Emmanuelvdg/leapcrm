import { defineLogicFunction } from 'twenty-sdk/define';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { NIGHTLY_SCORING_CRON_PATTERN } from 'src/constants/deal-health-settings';
import { NIGHTLY_SCORING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { getDealHealthSettings } from 'src/utils/get-deal-health-settings';
import { scoreAllOpportunities } from 'src/utils/score-opportunities';

const handler = async (): Promise<object> =>
  scoreAllOpportunities({
    client: new CoreApiClient(),
    settings: getDealHealthSettings(),
    now: new Date(),
  });

// Time alone moves deals into risk (close dates pass, stages go stale) and
// task changes are not watched, so every deal is rescored once a day.
export default defineLogicFunction({
  universalIdentifier: NIGHTLY_SCORING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'score-all-opportunities-nightly',
  description: 'Rescores the health of every opportunity once a day.',
  timeoutSeconds: 300,
  cronTriggerSettings: {
    pattern: NIGHTLY_SCORING_CRON_PATTERN,
  },
  handler,
});
