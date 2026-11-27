import { type CoreApiClient } from 'twenty-client-sdk/core';

import { type TaxScheme } from 'src/constants/quote-options';
import {
  clampPercent,
  fromMicros,
  type QuoteLineInput,
  type QuoteTotals,
  toMicros,
} from 'src/utils/quote-math';
import { type Money, type QuoteRecord } from 'src/utils/quote-records';
import { totalsToQuoteData } from 'src/utils/quote-totals';

export type EditableLine = {
  key: string;
  id: string | null;
  productId: string | null;
  name: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  taxRate: string;
  unit: string;
  hsnSacCode: string;
  catalogueCurrency: string | null;
};

export type QuoteDraft = {
  name: string;
  currencyCode: string;
  taxScheme: TaxScheme;
  placeOfSupply: string;
  validUntil: string;
  terms: string;
  lines: EditableLine[];
};

export type ProductOption = {
  id: string;
  name: string;
  sku: string | null;
  unitPrice: Money | null;
  taxRate: number | null;
  unit: string | null;
  hsnSacCode: string | null;
};

let lineKeyCounter = 0;

const nextLineKey = () => {
  lineKeyCounter += 1;

  return `line-${Date.now()}-${lineKeyCounter}`;
};

const numberText = (value: number): string =>
  Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '0';

// Typed amounts may carry thousands separators ("1,25,000") or stray spaces.
export const toNumber = (text: string): number => {
  const parsed = Number(text.replace(/[,\s]/g, ''));

  return Number.isFinite(parsed) ? parsed : 0;
};

export const draftFromQuote = (quote: QuoteRecord): QuoteDraft => ({
  name: quote.name,
  currencyCode: quote.currencyCode,
  taxScheme: quote.taxScheme,
  placeOfSupply: quote.placeOfSupply ?? '',
  validUntil: quote.validUntil ?? '',
  terms: quote.terms ?? '',
  lines: quote.lineItems.map((line) => ({
    key: line.id,
    id: line.id,
    productId: line.productId,
    name: line.name,
    quantity: numberText(line.quantity),
    unitPrice: numberText(fromMicros(line.unitPrice.amountMicros)),
    discountPercent: numberText(line.discountPercent),
    taxRate: numberText(line.taxRate),
    unit: line.unit ?? '',
    hsnSacCode: line.hsnSacCode ?? '',
    catalogueCurrency: null,
  })),
});

export const blankLine = (): EditableLine => ({
  key: nextLineKey(),
  id: null,
  productId: null,
  name: '',
  quantity: '1',
  unitPrice: '0',
  discountPercent: '0',
  taxRate: '0',
  unit: '',
  hsnSacCode: '',
  catalogueCurrency: null,
});

export const lineFromProduct = (
  product: ProductOption,
  quoteCurrency: string,
): EditableLine => ({
  ...blankLine(),
  productId: product.id,
  name: product.name,
  unitPrice: numberText(fromMicros(product.unitPrice?.amountMicros ?? 0)),
  taxRate: numberText(product.taxRate ?? 0),
  unit: product.unit ?? '',
  hsnSacCode: product.hsnSacCode ?? '',
  catalogueCurrency:
    product.unitPrice && product.unitPrice.currencyCode !== quoteCurrency
      ? product.unitPrice.currencyCode
      : null,
});

export const toLineInputs = (lines: EditableLine[]): QuoteLineInput[] =>
  lines.map((line) => ({
    quantity: toNumber(line.quantity),
    unitPriceMicros: toMicros(toNumber(line.unitPrice)),
    discountPercent: clampPercent(toNumber(line.discountPercent)),
    taxRate: clampPercent(toNumber(line.taxRate)),
  }));

const textOrNull = (value: string): string | null =>
  value.trim() === '' ? null : value.trim();

export const buildLineData = ({
  line,
  index,
  totals,
  currencyCode,
  quoteId,
}: {
  line: EditableLine;
  index: number;
  totals: QuoteTotals;
  currencyCode: string;
  quoteId: string;
}): Record<string, unknown> => {
  const [input] = toLineInputs([line]);

  return {
    quoteId,
    productId: line.productId,
    name: line.name.trim() || 'Item',
    quantity: input.quantity,
    unitPrice: { amountMicros: input.unitPriceMicros, currencyCode },
    discountPercent: input.discountPercent,
    taxRate: input.taxRate,
    unit: textOrNull(line.unit),
    hsnSacCode: textOrNull(line.hsnSacCode),
    sortOrder: index,
    lineTotal: {
      amountMicros: totals.lines[index]?.netMicros ?? 0,
      currencyCode,
    },
  };
};

export const saveQuoteDraft = async ({
  client,
  quoteId,
  draft,
  totals,
  originalLineIds,
}: {
  client: CoreApiClient;
  quoteId: string;
  draft: QuoteDraft;
  totals: QuoteTotals;
  originalLineIds: string[];
}): Promise<void> => {
  const keptIds = new Set(
    draft.lines
      .map((line) => line.id)
      .filter((id): id is string => id !== null),
  );

  for (const removedId of originalLineIds.filter((id) => !keptIds.has(id))) {
    await client.mutation({
      deleteQuoteLineItem: { __args: { id: removedId }, id: true },
    });
  }

  for (const [index, line] of draft.lines.entries()) {
    const data = buildLineData({
      line,
      index,
      totals,
      currencyCode: draft.currencyCode,
      quoteId,
    });

    if (line.id) {
      await client.mutation({
        updateQuoteLineItem: { __args: { id: line.id, data }, id: true },
      });
    } else {
      await client.mutation({
        createQuoteLineItem: { __args: { data }, id: true },
      });
    }
  }

  await client.mutation({
    updateQuote: {
      __args: {
        id: quoteId,
        data: {
          name: draft.name.trim() || null,
          taxScheme: draft.taxScheme,
          placeOfSupply:
            draft.taxScheme === 'GST' ? textOrNull(draft.placeOfSupply) : null,
          validUntil: textOrNull(draft.validUntil),
          terms: textOrNull(draft.terms),
          ...totalsToQuoteData(totals, draft.currencyCode),
        },
      },
      id: true,
    },
  });
};
