import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineLogicFunction } from 'twenty-sdk/define';

import {
  NEW_ACTIVITY_CRON_PATTERN,
  NEW_ACTIVITY_LOOKBACK_MINUTES,
} from 'src/constants/deal-coach-settings';
import { REFRESH_DEALS_WITH_NEW_ACTIVITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { findDealsWithNewActivity } from 'src/utils/find-deals-to-refresh';
import { getDealCoachSettings } from 'src/utils/get-deal-coach-settings';
import { refreshManyNextBestActions } from 'src/utils/refresh-next-best-action';

// Shorter than the cron interval so two runs never work on the same deals.
const TIMEOUT_SECONDS = 840;
const DEADLINE_RESERVE_MS = 30_000;

const handler = async (): Promise<object> => {
  const startedAtMs = Date.now();
  const now = new Date(startedAtMs);
  const client = new CoreApiClient();
  const settings = getDealCoachSettings();

  const opportunityIds = await findDealsWithNewActivity({
    client,
    since: new Date(
      startedAtMs - NEW_ACTIVITY_LOOKBACK_MINUTES * 60 * 1000,
    ).toISOString(),
    now,
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

// Running on a schedule instead of on each event batches a burst of messages
// into one agent run per deal, and caps how many deals one run can bill.
export default defineLogicFunction({
  universalIdentifier:
    REFRESH_DEALS_WITH_NEW_ACTIVITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'refresh-deals-with-new-activity',
  description:
    'Every 15 minutes, refreshes the next best action of deals that got a new WhatsApp message, email or call summary, or changed stage or close date, since their last suggestion.',
  timeoutSeconds: TIMEOUT_SECONDS,
  cronTriggerSettings: { pattern: NEW_ACTIVITY_CRON_PATTERN },
  handler,
});
