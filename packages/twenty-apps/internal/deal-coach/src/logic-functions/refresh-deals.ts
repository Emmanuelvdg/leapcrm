import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';

import {
  MAX_DEALS_PER_MANUAL_REFRESH,
  REFRESH_DEALS_ROUTE_PATH,
} from 'src/constants/refresh-deals-route-path';
import { REFRESH_DEALS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { getDealCoachSettings } from 'src/utils/get-deal-coach-settings';
import { refreshManyNextBestActions } from 'src/utils/refresh-next-best-action';

const TIMEOUT_SECONDS = 600;
const DEADLINE_RESERVE_MS = 30_000;

type RefreshDealsRouteBody = { opportunityIds?: unknown };

const readOpportunityIds = (body: RefreshDealsRouteBody | null | undefined) =>
  Array.isArray(body?.opportunityIds)
    ? [
        ...new Set(
          body.opportunityIds.filter(
            (id): id is string => typeof id === 'string' && id.length > 0,
          ),
        ),
      ]
    : [];

const handler = async (
  payload: RoutePayload<RefreshDealsRouteBody>,
): Promise<object> => {
  const startedAtMs = Date.now();
  const opportunityIds = readOpportunityIds(payload.body);

  if (opportunityIds.length === 0) {
    return { outcome: 'nothing-selected' };
  }

  if (opportunityIds.length > MAX_DEALS_PER_MANUAL_REFRESH) {
    return { outcome: 'too-many-selected' };
  }

  const result = await refreshManyNextBestActions({
    client: new CoreApiClient(),
    opportunityIds,
    settings: getDealCoachSettings(),
    deadlineAtMs: startedAtMs + TIMEOUT_SECONDS * 1000 - DEADLINE_RESERVE_MS,
  });

  return { outcome: 'processed', ...result };
};

export default defineLogicFunction({
  universalIdentifier: REFRESH_DEALS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'refresh-deals',
  description:
    'Asks the Deal coach agent for a fresh next best action on the given opportunities. Used by the "Suggest next step" command and the Regenerate button.',
  timeoutSeconds: TIMEOUT_SECONDS,
  handler,
  httpRouteTriggerSettings: {
    path: REFRESH_DEALS_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
