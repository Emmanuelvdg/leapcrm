import { useEffect, useMemo, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { getApplicationVariable, useUserId } from 'twenty-sdk/front-component';

import { type ProductOption } from 'src/front-components/utils/quote-draft';
import {
  nodesOf,
  QUOTE_SELECTION,
  type QuoteRecord,
  type RawQuote,
  toMoney,
  toQuoteRecord,
} from 'src/utils/quote-records';
import {
  type QuoteSettings,
  readQuoteSettings,
} from 'src/utils/quote-settings';

// A quote added from a list gets its number from a background job a moment
// after it is created, so the editor looks again a few times.
const NUMBER_RETRY_DELAY_MS = 2_500;
const MAX_NUMBER_RETRIES = 4;

type EditorData = {
  quote: QuoteRecord | undefined;
  baseUrl: string | undefined;
  currentUserEmail: string | null;
  errorMessage: string | undefined;
  loadCount: number;
  isWaitingForNumber: boolean;
};

export const useQuoteEditorData = (quoteId: string | null) => {
  const userId = useUserId();
  const [reloadToken, setReloadToken] = useState(0);
  const [data, setData] = useState<EditorData>({
    quote: undefined,
    baseUrl: undefined,
    currentUserEmail: null,
    errorMessage: undefined,
    loadCount: 0,
    isWaitingForNumber: false,
  });

  const settings: QuoteSettings = useMemo(
    () => readQuoteSettings(getApplicationVariable),
    [],
  );

  useEffect(() => {
    if (quoteId === null) {
      return;
    }

    let isCancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const load = async (attempt: number) => {
      try {
        const client = new CoreApiClient();
        const [{ quotes }, { currentWorkspace }, members] = await Promise.all([
          client.query({
            quotes: {
              __args: { filter: { id: { eq: quoteId } }, first: 1 },
              edges: { node: QUOTE_SELECTION },
            },
          }),
          new MetadataApiClient().query({
            currentWorkspace: {
              workspaceUrls: { subdomainUrl: true, customUrl: true },
            },
          }),
          userId
            ? client.query({
                workspaceMembers: {
                  __args: { filter: { userId: { eq: userId } }, first: 1 },
                  edges: { node: { userEmail: true } },
                },
              })
            : Promise.resolve({ workspaceMembers: null }),
        ]);

        if (isCancelled) {
          return;
        }

        const raw = nodesOf(quotes as { edges: { node: RawQuote }[] })[0];
        const quote = raw
          ? toQuoteRecord(raw, settings.defaultCurrency)
          : undefined;
        const urls = (
          currentWorkspace as {
            workspaceUrls: {
              subdomainUrl: string | null;
              customUrl: string | null;
            };
          } | null
        )?.workspaceUrls;
        const member = nodesOf(
          members.workspaceMembers as {
            edges: { node: { userEmail: string | null } }[];
          } | null,
        )[0];

        const isWaitingForNumber =
          quote !== undefined &&
          !quote.quoteNumber &&
          attempt < MAX_NUMBER_RETRIES;

        setData((previous) => ({
          quote,
          baseUrl: urls?.customUrl || urls?.subdomainUrl || undefined,
          currentUserEmail: member?.userEmail?.toLowerCase() ?? null,
          errorMessage: quote ? undefined : 'This quote no longer exists.',
          loadCount: previous.loadCount + 1,
          isWaitingForNumber,
        }));

        if (isWaitingForNumber) {
          retryTimer = setTimeout(() => {
            void load(attempt + 1);
          }, NUMBER_RETRY_DELAY_MS);
        }
      } catch {
        if (!isCancelled) {
          setData((previous) => ({
            ...previous,
            errorMessage: 'Could not load this quote. Try again in a minute.',
          }));
        }
      }
    };

    void load(0);

    return () => {
      isCancelled = true;

      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [quoteId, reloadToken, userId, settings.defaultCurrency]);

  return {
    ...data,
    settings,
    reload: () => setReloadToken((token) => token + 1),
  };
};

type ProductNode = {
  id: string;
  name: string | null;
  sku: string | null;
  unitPrice: {
    amountMicros: number | string | null;
    currencyCode: string | null;
  } | null;
  taxRate: number | null;
  unit: string | null;
  hsnSacCode: string | null;
};

export const searchProducts = async (
  searchText: string,
  defaultCurrency: string,
): Promise<ProductOption[]> => {
  const trimmed = searchText.trim();
  const pattern = `%${trimmed}%`;

  const { products } = await new CoreApiClient().query({
    products: {
      __args: {
        filter: {
          and: [
            { isActive: { eq: true } },
            ...(trimmed
              ? [
                  {
                    or: [
                      { name: { ilike: pattern } },
                      { sku: { ilike: pattern } },
                    ],
                  },
                ]
              : []),
          ],
        },
        orderBy: [{ name: 'AscNullsLast' }],
        first: 12,
      },
      edges: {
        node: {
          id: true,
          name: true,
          sku: true,
          unitPrice: { amountMicros: true, currencyCode: true },
          taxRate: true,
          unit: true,
          hsnSacCode: true,
        },
      },
    },
  });

  return nodesOf(products as { edges: { node: ProductNode }[] }).map(
    (product) => ({
      id: product.id,
      name: product.name ?? 'Unnamed product',
      sku: product.sku,
      unitPrice: product.unitPrice
        ? toMoney(product.unitPrice, defaultCurrency)
        : null,
      taxRate: product.taxRate,
      unit: product.unit,
      hsnSacCode: product.hsnSacCode,
    }),
  );
};
