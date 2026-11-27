import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineLogicFunction } from 'twenty-sdk/define';

import { OPEN_FOR_RESPONSE_STATUSES } from 'src/constants/quote-options';
import { EXPIRE_QUOTES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { toIsoDate } from 'src/utils/format-money';
import { nodesOf, updateQuote } from 'src/utils/quote-records';

const BATCH_SIZE = 200;

// Expiring overnight makes "Expired" usable as a workflow trigger and in
// views; opening a stale link also expires it on the spot.
const handler = async (): Promise<object> => {
  const client = new CoreApiClient();
  const today = toIsoDate(new Date());

  const { quotes } = await client.query({
    quotes: {
      __args: {
        filter: { validUntil: { lt: today } },
        orderBy: [{ validUntil: 'AscNullsLast' }],
        first: BATCH_SIZE,
      },
      edges: { node: { id: true, status: true } },
    },
  });

  const expiredIds = nodesOf(
    quotes as { edges: { node: { id: string; status: string | null } }[] },
  )
    .filter((quote) =>
      OPEN_FOR_RESPONSE_STATUSES.some((status) => status === quote.status),
    )
    .map((quote) => quote.id);

  for (const quoteId of expiredIds) {
    await updateQuote(client, quoteId, { status: 'EXPIRED' });
  }

  return { expiredCount: expiredIds.length };
};

export default defineLogicFunction({
  universalIdentifier: EXPIRE_QUOTES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'expire-quotes-nightly',
  description:
    'Marks sent quotes past their valid-until date as Expired, every night.',
  timeoutSeconds: 300,
  cronTriggerSettings: { pattern: '30 3 * * *' },
  handler,
});
