import { definePostInstallLogicFunction } from 'twenty-sdk/define';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { INITIAL_SCORING_POST_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { getDealHealthSettings } from 'src/utils/get-deal-health-settings';
import { scoreAllOpportunities } from 'src/utils/score-opportunities';

const handler = async (): Promise<object> =>
  scoreAllOpportunities({
    client: new CoreApiClient(),
    settings: getDealHealthSettings(),
    now: new Date(),
  });

export default definePostInstallLogicFunction({
  universalIdentifier:
    INITIAL_SCORING_POST_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'score-all-opportunities-on-install',
  description:
    'Scores every existing opportunity right after installation so the Health column is filled in immediately.',
  timeoutSeconds: 300,
  shouldRunOnVersionUpgrade: false,
  handler,
});
