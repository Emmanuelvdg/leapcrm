import { vi } from 'vitest';
import { type CoreApiClient } from 'twenty-client-sdk/core';

import { type QuoteRecord } from 'src/utils/quote-records';
import {
  readQuoteSettings,
  type QuoteSettings,
} from 'src/utils/quote-settings';

export const buildSettings = (
  overrides: Partial<QuoteSettings> = {},
): QuoteSettings => ({
  ...readQuoteSettings(() => undefined),
  sellerState: 'Maharashtra',
  approverEmails: ['manager@acme.example'],
  ...overrides,
});

export const buildQuote = (
  overrides: Partial<QuoteRecord> = {},
): QuoteRecord => ({
  id: 'quote-1',
  name: 'Office fit-out',
  quoteNumber: 'Q-2026-0007',
  status: 'DRAFT',
  validUntil: '2026-12-31',
  taxScheme: 'GST',
  placeOfSupply: 'Maharashtra',
  currencyCode: 'INR',
  total: { amountMicros: 118_000_000_000, currencyCode: 'INR' },
  maxDiscountPercent: 0,
  terms: 'Pay in 30 days',
  accessToken: 'secret-token',
  sentAt: null,
  viewedAt: null,
  lastViewedAt: null,
  viewCount: 0,
  respondedAt: null,
  signerName: null,
  signature: null,
  declineReason: null,
  approvedAt: null,
  approvalNote: null,
  createdAt: '2026-11-27T08:00:00.000Z',
  opportunity: { id: 'deal-1', name: 'Kumar Infra office', stage: 'PROPOSAL' },
  company: { id: 'company-1', name: 'Kumar Infra', addressLines: ['Pune'] },
  person: {
    id: 'person-1',
    name: 'Arjun Mehta',
    email: 'arjun@kumarinfra.example',
    phone: null,
  },
  approvedBy: null,
  lineItems: [
    {
      id: 'line-1',
      name: 'Workstations',
      quantity: 10,
      unitPrice: { amountMicros: 10_000_000_000, currencyCode: 'INR' },
      discountPercent: 0,
      taxRate: 18,
      unit: 'pcs',
      hsnSacCode: '9403',
      sortOrder: 0,
      productId: 'product-1',
    },
  ],
  ...overrides,
});

type RecordedMutation = { name: string; args: Record<string, unknown> };

// A stand-in for the API client: queries are answered from the given
// handlers and every mutation is recorded for the assertions.
export const buildClient = ({
  quote,
  queries = {},
  failMutation,
}: {
  quote?: QuoteRecord;
  queries?: Record<string, (args: Record<string, unknown>) => unknown>;
  failMutation?: (name: string, args: Record<string, unknown>) => boolean;
}) => {
  const mutations: RecordedMutation[] = [];

  const query = vi.fn(
    async (request: Record<string, { __args?: Record<string, unknown> }>) => {
      const [rootField] = Object.keys(request);
      const args = request[rootField].__args ?? {};

      if (rootField === 'quotes' && quote) {
        const { lineItems, ...rest } = quote;

        return {
          quotes: {
            edges: [
              {
                node: {
                  ...rest,
                  company: quote.company
                    ? {
                        id: quote.company.id,
                        name: quote.company.name,
                        address: null,
                      }
                    : null,
                  person: quote.person
                    ? {
                        id: quote.person.id,
                        name: { firstName: quote.person.name, lastName: '' },
                        emails: { primaryEmail: quote.person.email },
                        phones: null,
                      }
                    : null,
                  approvedBy: null,
                  lineItems: { edges: lineItems.map((node) => ({ node })) },
                },
              },
            ],
          },
        };
      }

      const handler = queries[rootField];

      return { [rootField]: handler ? handler(args) : { edges: [] } };
    },
  );

  const mutation = vi.fn(
    async (request: Record<string, { __args: Record<string, unknown> }>) => {
      const [name] = Object.keys(request);
      const args = request[name].__args;

      if (failMutation?.(name, args)) {
        throw new Error(`${name} failed`);
      }

      mutations.push({ name, args });

      return { [name]: { id: `${name}-${mutations.length}` } };
    },
  );

  return {
    client: { query, mutation } as unknown as CoreApiClient,
    mutations,
    mutationsNamed: (name: string) =>
      mutations.filter((recorded) => recorded.name === name),
  };
};
