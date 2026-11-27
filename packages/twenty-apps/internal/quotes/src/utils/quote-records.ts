import { type CoreApiClient } from 'twenty-client-sdk/core';

import { MAX_LINE_ITEMS } from 'src/constants/quote-settings';
import { type QuoteStatus, type TaxScheme } from 'src/constants/quote-options';

type Edges<TNode> = { edges: { node: TNode }[] } | null | undefined;

export const nodesOf = <TNode>(connection: Edges<TNode>): TNode[] =>
  (connection?.edges ?? []).map((edge) => edge.node);

export type Money = { amountMicros: number; currencyCode: string };

type RawMoney = {
  amountMicros: number | string | null;
  currencyCode: string | null;
} | null;

export const toMoney = (value: RawMoney, fallbackCurrency: string): Money => ({
  amountMicros: Number(value?.amountMicros ?? 0) || 0,
  currencyCode: value?.currencyCode || fallbackCurrency,
});

export type QuoteLineRecord = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: Money;
  discountPercent: number;
  taxRate: number;
  unit: string | null;
  hsnSacCode: string | null;
  sortOrder: number;
  productId: string | null;
};

export type QuoteRecord = {
  id: string;
  name: string;
  quoteNumber: string | null;
  status: QuoteStatus;
  validUntil: string | null;
  taxScheme: TaxScheme;
  placeOfSupply: string | null;
  currencyCode: string;
  total: Money;
  maxDiscountPercent: number;
  terms: string | null;
  accessToken: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  respondedAt: string | null;
  signerName: string | null;
  signature: string | null;
  declineReason: string | null;
  approvedAt: string | null;
  approvalNote: string | null;
  createdAt: string;
  opportunity: {
    id: string;
    name: string | null;
    stage: string | null;
  } | null;
  company: {
    id: string;
    name: string | null;
    addressLines: string[];
  } | null;
  person: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  approvedBy: { id: string; name: string } | null;
  lineItems: QuoteLineRecord[];
};

export const QUOTE_SELECTION = {
  id: true,
  name: true,
  quoteNumber: true,
  status: true,
  validUntil: true,
  taxScheme: true,
  placeOfSupply: true,
  total: { amountMicros: true, currencyCode: true },
  maxDiscountPercent: true,
  terms: true,
  accessToken: true,
  sentAt: true,
  viewedAt: true,
  lastViewedAt: true,
  viewCount: true,
  respondedAt: true,
  signerName: true,
  signature: true,
  declineReason: true,
  approvedAt: true,
  approvalNote: true,
  createdAt: true,
  opportunity: { id: true, name: true, stage: true },
  company: {
    id: true,
    name: true,
    address: {
      addressStreet1: true,
      addressStreet2: true,
      addressCity: true,
      addressState: true,
      addressPostcode: true,
      addressCountry: true,
    },
  },
  person: {
    id: true,
    name: { firstName: true, lastName: true },
    emails: { primaryEmail: true },
    phones: { primaryPhoneNumber: true, primaryPhoneCallingCode: true },
  },
  approvedBy: { id: true, name: { firstName: true, lastName: true } },
  lineItems: {
    __args: {
      first: MAX_LINE_ITEMS,
      orderBy: [{ sortOrder: 'AscNullsLast' as const }],
    },
    edges: {
      node: {
        id: true,
        name: true,
        quantity: true,
        unitPrice: { amountMicros: true, currencyCode: true },
        discountPercent: true,
        taxRate: true,
        unit: true,
        hsnSacCode: true,
        sortOrder: true,
        productId: true,
      },
    },
  },
};

type RawName = { firstName: string | null; lastName: string | null } | null;

export const fullName = (name: RawName): string =>
  [name?.firstName, name?.lastName].filter(Boolean).join(' ').trim();

export type RawQuote = Omit<
  QuoteRecord,
  | 'currencyCode'
  | 'total'
  | 'maxDiscountPercent'
  | 'viewCount'
  | 'company'
  | 'person'
  | 'approvedBy'
  | 'lineItems'
  | 'name'
  | 'status'
  | 'taxScheme'
> & {
  name: string | null;
  status: QuoteStatus | null;
  taxScheme: TaxScheme | null;
  total: RawMoney;
  maxDiscountPercent: number | null;
  viewCount: number | null;
  company: {
    id: string;
    name: string | null;
    address: Record<string, string | null> | null;
  } | null;
  person: {
    id: string;
    name: RawName;
    emails: { primaryEmail: string | null } | null;
    phones: {
      primaryPhoneNumber: string | null;
      primaryPhoneCallingCode: string | null;
    } | null;
  } | null;
  approvedBy: { id: string; name: RawName } | null;
  lineItems: Edges<
    Omit<
      QuoteLineRecord,
      | 'unitPrice'
      | 'quantity'
      | 'discountPercent'
      | 'taxRate'
      | 'sortOrder'
      | 'name'
    > & {
      name: string | null;
      unitPrice: RawMoney;
      quantity: number | null;
      discountPercent: number | null;
      taxRate: number | null;
      sortOrder: number | null;
    }
  >;
};

const toAddressLines = (
  address: Record<string, string | null> | null,
): string[] => {
  if (!address) {
    return [];
  }

  const cityLine = [
    address.addressCity,
    address.addressState,
    address.addressPostcode,
  ]
    .filter(Boolean)
    .join(', ');

  return [
    address.addressStreet1,
    address.addressStreet2,
    cityLine,
    address.addressCountry,
  ].filter((line): line is string => Boolean(line?.trim()));
};

// The API returns an empty text field as "" rather than null.
const textOrNull = (value: string | null | undefined): string | null =>
  value ? value : null;

export const toQuoteRecord = (
  raw: RawQuote,
  defaultCurrency: string,
): QuoteRecord => {
  const currencyCode = raw.total?.currencyCode || defaultCurrency;
  const phone = raw.person?.phones;

  return {
    ...raw,
    quoteNumber: textOrNull(raw.quoteNumber),
    placeOfSupply: textOrNull(raw.placeOfSupply),
    terms: textOrNull(raw.terms),
    accessToken: textOrNull(raw.accessToken),
    signerName: textOrNull(raw.signerName),
    signature: textOrNull(raw.signature),
    declineReason: textOrNull(raw.declineReason),
    approvalNote: textOrNull(raw.approvalNote),
    name: raw.name ?? '',
    status: raw.status ?? 'DRAFT',
    taxScheme: raw.taxScheme ?? 'NONE',
    currencyCode,
    total: toMoney(raw.total, currencyCode),
    maxDiscountPercent: raw.maxDiscountPercent ?? 0,
    viewCount: raw.viewCount ?? 0,
    company: raw.company
      ? {
          id: raw.company.id,
          name: raw.company.name,
          addressLines: toAddressLines(raw.company.address),
        }
      : null,
    person: raw.person
      ? {
          id: raw.person.id,
          name: fullName(raw.person.name),
          email: raw.person.emails?.primaryEmail ?? null,
          phone: phone?.primaryPhoneNumber
            ? `${phone.primaryPhoneCallingCode ?? ''}${phone.primaryPhoneNumber}`
            : null,
        }
      : null,
    approvedBy: raw.approvedBy
      ? { id: raw.approvedBy.id, name: fullName(raw.approvedBy.name) }
      : null,
    lineItems: nodesOf(raw.lineItems).map((line, index) => ({
      ...line,
      name: line.name ?? '',
      unit: textOrNull(line.unit),
      hsnSacCode: textOrNull(line.hsnSacCode),
      unitPrice: toMoney(line.unitPrice, currencyCode),
      quantity: line.quantity ?? 0,
      discountPercent: line.discountPercent ?? 0,
      taxRate: line.taxRate ?? 0,
      sortOrder: line.sortOrder ?? index,
    })),
  };
};

// The single-record query throws on an unknown id, so a filtered list is used
// and a missing quote comes back as undefined.
export const fetchQuote = async (
  client: CoreApiClient,
  quoteId: string,
  defaultCurrency: string,
): Promise<QuoteRecord | undefined> => {
  const { quotes } = await client.query({
    quotes: {
      __args: { filter: { id: { eq: quoteId } }, first: 1 },
      edges: { node: QUOTE_SELECTION },
    },
  });

  const raw = nodesOf(quotes as Edges<RawQuote>)[0];

  return raw ? toQuoteRecord(raw, defaultCurrency) : undefined;
};

export const updateQuote = async (
  client: CoreApiClient,
  quoteId: string,
  data: Record<string, unknown>,
): Promise<void> => {
  await client.mutation({
    updateQuote: { __args: { id: quoteId, data }, id: true },
  });
};

export const createQuote = async (
  client: CoreApiClient,
  data: Record<string, unknown>,
): Promise<string> => {
  const { createQuote: quote } = await client.mutation({
    createQuote: { __args: { data }, id: true },
  });

  return (quote as { id: string }).id;
};

export const createLineItem = async (
  client: CoreApiClient,
  data: Record<string, unknown>,
): Promise<void> => {
  await client.mutation({
    createQuoteLineItem: { __args: { data }, id: true },
  });
};

export const findRecentQuoteNumbers = async (
  client: CoreApiClient,
  head: string,
): Promise<string[]> => {
  const { quotes } = await client.query({
    quotes: {
      __args: {
        filter: { quoteNumber: { like: `${head}%` } },
        orderBy: [{ createdAt: 'DescNullsLast' }],
        first: 50,
      },
      edges: { node: { quoteNumber: true } },
    },
  });

  return nodesOf(quotes as Edges<{ quoteNumber: string | null }>)
    .map((quote) => quote.quoteNumber)
    .filter((quoteNumber): quoteNumber is string => Boolean(quoteNumber));
};

export const createNote = async (
  client: CoreApiClient,
  {
    title,
    markdown,
    opportunityId,
    personId,
  }: {
    title: string;
    markdown: string;
    opportunityId: string | null;
    personId: string | null;
  },
): Promise<void> => {
  const { createNote: note } = await client.mutation({
    createNote: {
      __args: { data: { title, bodyV2: { markdown } } },
      id: true,
    },
  });
  const noteId = (note as { id: string }).id;

  const targets: Record<string, string>[] = [
    ...(opportunityId ? [{ targetOpportunityId: opportunityId }] : []),
    ...(personId ? [{ targetPersonId: personId }] : []),
  ];

  for (const target of targets) {
    await client.mutation({
      createNoteTarget: { __args: { data: { noteId, ...target } }, id: true },
    });
  }
};
