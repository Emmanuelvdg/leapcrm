import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import {
  PUBLIC_ROUTE_FORWARDED_HEADERS,
  SERVE_QUOTE_ROUTE_PATH,
} from 'src/constants/quote-settings';
import { SERVE_QUOTE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  isVisibleToCustomer,
  loadQuoteForToken,
  recordCustomerView,
} from 'src/utils/public-quote';
import { getServerQuoteSettings } from 'src/utils/quote-settings';
import { computeTotalsFor } from 'src/utils/quote-totals';
import {
  renderMessagePage,
  renderQuotePage,
} from 'src/utils/render-quote-page';
import { getSellerName } from 'src/utils/seller-name';

const htmlResponse = (status: number, body: string) =>
  new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const handler = async (payload: RoutePayload): Promise<object> => {
  const quoteId = payload.pathParameters.quoteId ?? '';
  const token = payload.queryStringParameters.t ?? '';
  const isPreview = payload.queryStringParameters.preview === '1';
  const settings = getServerQuoteSettings();
  const brandColor = settings.brandColor;

  try {
    const client = new CoreApiClient();
    const loaded = await loadQuoteForToken({
      client,
      quoteId,
      token,
      settings,
    });

    if (!loaded) {
      return htmlResponse(
        404,
        renderMessagePage({
          title: 'Quote not found',
          message:
            'This link is not valid any more. Ask your contact to send the quote again.',
          brandColor,
        }),
      );
    }

    if (!isPreview && !isVisibleToCustomer(loaded)) {
      return htmlResponse(
        200,
        renderMessagePage({
          title: 'This quote is being updated',
          message:
            'Your contact is making changes to this quote. You will get the updated version shortly.',
          brandColor,
        }),
      );
    }

    const quote = isPreview
      ? loaded
      : await recordCustomerView({ client, quote: loaded, now: new Date() });

    const totals = computeTotalsFor({
      lines: quote.lineItems.map((line) => ({
        quantity: line.quantity,
        unitPriceMicros: line.unitPrice.amountMicros,
        discountPercent: line.discountPercent,
        taxRate: line.taxRate,
      })),
      taxScheme: quote.taxScheme,
      sellerState: settings.sellerState,
      placeOfSupply: quote.placeOfSupply,
    });

    return htmlResponse(
      200,
      renderQuotePage({
        quote,
        totals,
        settings,
        sellerName: await getSellerName(settings),
        isPreview,
        respondUrl: `/s/quotes/view/${quote.id}/response`,
        token,
      }),
    );
  } catch (error) {
    console.error(
      `Quotes could not render quote ${quoteId}: ${error instanceof Error ? error.message : String(error)}`,
    );

    return htmlResponse(
      500,
      renderMessagePage({
        title: 'Something went wrong',
        message: 'The quote could not be loaded. Please try again later.',
        brandColor,
      }),
    );
  }
};

export default defineLogicFunction({
  universalIdentifier: SERVE_QUOTE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'serve-quote',
  description:
    'Serves the private link of a quote, where the customer can read it, download a PDF and accept or decline.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: SERVE_QUOTE_ROUTE_PATH,
    httpMethod: 'GET',
    isAuthRequired: false,
    forwardedRequestHeaders: PUBLIC_ROUTE_FORWARDED_HEADERS,
  },
});
