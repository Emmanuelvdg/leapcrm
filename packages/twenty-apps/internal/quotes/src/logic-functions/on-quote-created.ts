import { CoreApiClient } from 'twenty-client-sdk/core';
import {
  defineLogicFunction,
  type ObjectRecordCreateEvent,
} from 'twenty-sdk/define';
import { type DatabaseEventPayload } from 'twenty-sdk/logic-function';

import { ON_QUOTE_CREATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  allocateQuoteNumber,
  buildNewQuoteDefaults,
} from 'src/utils/quote-actions';
import { nodesOf, updateQuote } from 'src/utils/quote-records';
import { getServerQuoteSettings } from 'src/utils/quote-settings';

type CreatedQuote = { id?: string | null };

type QuoteDefaultsNode = {
  id: string;
  name: string | null;
  quoteNumber: string | null;
  opportunityId: string | null;
  companyId: string | null;
  personId: string | null;
  opportunity: {
    companyId: string | null;
    pointOfContactId: string | null;
  } | null;
};

// Quotes made from a deal or duplicated already arrive complete. One added
// with "+ New" in a list gets its number, dates, tax defaults and customer
// here.
const handler = async (
  event: DatabaseEventPayload<ObjectRecordCreateEvent<CreatedQuote>>,
): Promise<object> => {
  const quoteId = event.properties.after.id ?? event.recordId;

  if (!quoteId) {
    return { outcome: 'no-record' };
  }

  const client = new CoreApiClient();
  const settings = getServerQuoteSettings();

  const { quotes } = await client.query({
    quotes: {
      __args: { filter: { id: { eq: quoteId } }, first: 1 },
      edges: {
        node: {
          id: true,
          name: true,
          quoteNumber: true,
          opportunityId: true,
          companyId: true,
          personId: true,
          opportunity: { companyId: true, pointOfContactId: true },
        },
      },
    },
  });

  const quote = nodesOf(quotes as { edges: { node: QuoteDefaultsNode }[] })[0];

  if (!quote || quote.quoteNumber) {
    return { outcome: 'already-set-up' };
  }

  const now = new Date();
  const quoteNumber = await allocateQuoteNumber(client, settings, now);

  await updateQuote(client, quote.id, {
    ...buildNewQuoteDefaults({ settings, now, quoteNumber }),
    ...(quote.name ? {} : { name: quoteNumber }),
    ...(!quote.companyId && quote.opportunity?.companyId
      ? { companyId: quote.opportunity.companyId }
      : {}),
    ...(!quote.personId && quote.opportunity?.pointOfContactId
      ? { personId: quote.opportunity.pointOfContactId }
      : {}),
  });

  return { outcome: 'set-up', quoteNumber };
};

export default defineLogicFunction({
  universalIdentifier: ON_QUOTE_CREATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'on-quote-created',
  description:
    'Gives a quote added from a list its number, validity date, tax defaults, terms and private link.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'quote.created',
  },
  handler,
});
