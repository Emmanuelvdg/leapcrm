import { describe, expect, it } from 'vitest';

import {
  buildLineData,
  draftFromQuote,
  lineFromProduct,
  toLineInputs,
  toNumber,
} from 'src/front-components/utils/quote-draft';
import { buildQuote } from 'src/utils/__tests__/test-quote';
import { computeQuoteTotals } from 'src/utils/quote-math';

describe('quote draft helpers', () => {
  it('reads typed numbers with separators', () => {
    expect(toNumber('1,25,000.50')).toBe(125000.5);
    expect(toNumber(' 18 ')).toBe(18);
    expect(toNumber('abc')).toBe(0);
  });

  it('round-trips a saved quote into editable lines', () => {
    const draft = draftFromQuote(buildQuote());

    expect(draft.lines[0]).toMatchObject({
      id: 'line-1',
      quantity: '10',
      unitPrice: '10000',
      taxRate: '18',
      hsnSacCode: '9403',
    });
    expect(toLineInputs(draft.lines)[0]).toEqual({
      quantity: 10,
      unitPriceMicros: 10_000_000_000,
      discountPercent: 0,
      taxRate: 18,
    });
  });

  it('flags a catalogue price in another currency', () => {
    const line = lineFromProduct(
      {
        id: 'product-2',
        name: 'Support plan',
        sku: 'SUP-1',
        unitPrice: { amountMicros: 99_000_000, currencyCode: 'USD' },
        taxRate: 18,
        unit: 'month',
        hsnSacCode: null,
      },
      'INR',
    );

    expect(line).toMatchObject({
      productId: 'product-2',
      unitPrice: '99',
      catalogueCurrency: 'USD',
    });
  });

  it('builds the saved line in the quote currency with its amount', () => {
    const [line] = draftFromQuote(buildQuote()).lines;
    const totals = computeQuoteTotals({
      lines: toLineInputs([{ ...line, discountPercent: '5' }]),
      taxScheme: 'GST',
      isInterState: false,
    });

    expect(
      buildLineData({
        line: { ...line, discountPercent: '5', unit: ' ' },
        index: 0,
        totals,
        currencyCode: 'INR',
        quoteId: 'quote-1',
      }),
    ).toMatchObject({
      quoteId: 'quote-1',
      discountPercent: 5,
      unit: null,
      sortOrder: 0,
      lineTotal: { amountMicros: 95_000_000_000, currencyCode: 'INR' },
    });
  });
});
