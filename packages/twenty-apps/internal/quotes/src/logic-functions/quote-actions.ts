import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';

import { QUOTE_ACTIONS_ROUTE_PATH } from 'src/constants/quote-settings';
import { QUOTE_ACTIONS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  QUOTE_ACTION_NAMES,
  type QuoteActionRequest,
  type QuoteActionResult,
  runQuoteAction,
} from 'src/utils/quote-actions';
import { getServerQuoteSettings } from 'src/utils/quote-settings';
import { resolveCaller } from 'src/utils/resolve-caller';

const readText = (value: unknown, maxLength: number): string | null =>
  typeof value === 'string' && value.trim() !== ''
    ? value.trim().slice(0, maxLength)
    : null;

const parseRequest = (body: unknown): QuoteActionRequest | null => {
  const raw = (body ?? {}) as Record<string, unknown>;
  const action = QUOTE_ACTION_NAMES.find((name) => name === raw.action);

  if (!action) {
    return null;
  }

  const crmBaseUrl = readText(raw.crmBaseUrl, 300);

  return {
    action,
    quoteId: readText(raw.quoteId, 64),
    opportunityId: readText(raw.opportunityId, 64),
    note: readText(raw.note, 1000),
    crmBaseUrl:
      crmBaseUrl && /^https?:\/\//i.test(crmBaseUrl)
        ? crmBaseUrl.replace(/\/+$/, '')
        : null,
  };
};

const handler = async (payload: RoutePayload): Promise<QuoteActionResult> => {
  const request = parseRequest(payload.body);

  if (!request) {
    return { ok: false, reason: 'bad-request', message: 'Unknown action.' };
  }

  const client = new CoreApiClient();

  try {
    return await runQuoteAction(
      {
        client,
        settings: getServerQuoteSettings(),
        now: new Date(),
        caller: await resolveCaller(client, payload.userWorkspaceId),
      },
      request,
    );
  } catch (error) {
    console.error(
      `Quote action ${request.action} failed for ${request.quoteId ?? request.opportunityId ?? 'a new quote'}: ${error instanceof Error ? error.message : String(error)}`,
    );

    return {
      ok: false,
      reason: 'error',
      message: 'Something went wrong. Try again in a minute.',
    };
  }
};

export default defineLogicFunction({
  universalIdentifier: QUOTE_ACTIONS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'quote-actions',
  description:
    'Creates, sends, routes for approval, approves, reopens and duplicates quotes for signed-in users.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: QUOTE_ACTIONS_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
