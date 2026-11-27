import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineLogicFunction } from 'twenty-sdk/define';

import { NIGHTLY_REFRESH_CRON_PATTERN } from 'src/constants/deal-coach-settings';
import { REFRESH_STALE_DEALS_NIGHTLY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { findStaleOpenDeals } from 'src/utils/find-deals-to-refresh';
import { getDealCoachSettings } from 'src/utils/get-deal-coach-settings';
import { refreshManyNextBestActions } from 'src/utils/refresh-next-best-action';

const TIMEOUT_SECONDS = 900;
const DEADLINE_RESERVE_MS = 30_000;

const handler = async (): Promise<object> => {
  const startedAtMs = Date.now();
  const client = new CoreApiClient();
  const settings = getDealCoachSettings();

  const opportunityIds = await findStaleOpenDeals({
    client,
    now: new Date(startedAtMs),
    settings,
  });

  if (opportunityIds.length === 0) {
    return { outcome: 'nothing-to-refresh' };
  }

  const result = await refreshManyNextBestActions({
    client,
    opportunityIds,
    settings,
    deadlineAtMs: startedAtMs + TIMEOUT_SECONDS * 1000 - DEADLINE_RESERVE_MS,
  });

  return { outcome: 'processed', ...result };
};

// Quiet deals change too: silence itself is a signal, and new deals start
// without a suggestion. Oldest suggestions are refreshed first.
export default defineLogicFunction({
  universalIdentifier:
    REFRESH_STALE_DEALS_NIGHTLY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'refresh-stale-deals-nightly',
  description:
    'Once a night, refreshes open deals that have no suggestion yet or whose suggestion is older than REFRESH_AFTER_DAYS.',
  timeoutSeconds: TIMEOUT_SECONDS,
  cronTriggerSettings: { pattern: NIGHTLY_REFRESH_CRON_PATTERN },
  handler,
});
