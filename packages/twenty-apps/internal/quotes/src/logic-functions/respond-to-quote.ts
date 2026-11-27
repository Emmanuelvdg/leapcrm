import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import {
  PUBLIC_ROUTE_FORWARDED_HEADERS,
  RESPOND_TO_QUOTE_ROUTE_PATH,
} from 'src/constants/quote-settings';
import { RESPOND_TO_QUOTE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  applyQuoteResponse,
  loadQuoteForToken,
  parseQuoteResponse,
} from 'src/utils/public-quote';
import { getServerQuoteSettings } from 'src/utils/quote-settings';
import { getVisitorIp, hashSignerIp } from 'src/utils/security';

const jsonResponse = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const handler = async (payload: RoutePayload): Promise<object> => {
  const quoteId = payload.pathParameters.quoteId ?? '';
  const body = (payload.body ?? {}) as Record<string, unknown>;
  const token =
    (typeof body.t === 'string' ? body.t : null) ??
    payload.queryStringParameters.t ??
    '';

  try {
    const client = new CoreApiClient();
    const settings = getServerQuoteSettings();
    const quote = await loadQuoteForToken({ client, quoteId, token, settings });

    if (!quote) {
      return jsonResponse(404, {
        ok: false,
        message: 'This link is not valid any more.',
      });
    }

    const parsed = parseQuoteResponse(body);

    if (!parsed.ok) {
      return jsonResponse(400, { ok: false, message: parsed.message });
    }

    const result = await applyQuoteResponse({
      client,
      quote,
      input: parsed.input,
      settings,
      now: new Date(),
      signerIpHash: hashSignerIp(getVisitorIp(payload.headers), quote.id),
      userAgent: payload.headers['user-agent'] ?? null,
    });

    return result.ok
      ? jsonResponse(200, { ok: true, status: result.status })
      : jsonResponse(409, { ok: false, message: result.message });
  } catch (error) {
    console.error(
      `Quotes could not record a response to quote ${quoteId}: ${error instanceof Error ? error.message : String(error)}`,
    );

    return jsonResponse(500, {
      ok: false,
      message: 'Something went wrong. Please try again in a minute.',
    });
  }
};

export default defineLogicFunction({
  universalIdentifier: RESPOND_TO_QUOTE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'respond-to-quote',
  description:
    'Records a customer accepting and signing, or declining, a quote from its private link.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: RESPOND_TO_QUOTE_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: PUBLIC_ROUTE_FORWARDED_HEADERS,
  },
});
