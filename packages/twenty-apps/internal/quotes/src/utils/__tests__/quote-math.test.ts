import { describe, expect, it } from 'vitest';

import {
  computeLineAmounts,
  computeQuoteTotals,
  fromMicros,
  isInterStateSupply,
  toMicros,
} from 'src/utils/quote-math';

const line = (
  quantity: number,
  unitPrice: number,
  discountPercent = 0,
  taxRate = 18,
) => ({
  quantity,
  unitPriceMicros: toMicros(unitPrice),
  discountPercent,
  taxRate,
});

describe('computeLineAmounts', () => {
  it('applies the discount to quantity times rate, rounded to cents', () => {
    const amounts = computeLineAmounts(line(3, 333.33, 10));

    expect(fromMicros(amounts.grossMicros)).toBe(999.99);
    expect(fromMicros(amounts.discountMicros)).toBe(100);
    expect(fromMicros(amounts.netMicros)).toBe(899.99);
  });

  it('treats negative or invalid input as zero and caps discounts at 100%', () => {
    expect(computeLineAmounts(line(-2, 100)).grossMicros).toBe(0);
    expect(computeLineAmounts(line(1, 100, 150)).netMicros).toBe(0);
    expect(computeLineAmounts(line(Number.NaN, 100)).grossMicros).toBe(0);
  });
});

describe('isInterStateSupply', () => {
  it('compares states case-insensitively and treats unknown as local', () => {
    expect(isInterStateSupply('Maharashtra', 'maharashtra ')).toBe(false);
    expect(isInterStateSupply('Maharashtra', 'Karnataka')).toBe(true);
    expect(isInterStateSupply('Maharashtra', 'Outside India')).toBe(true);
    expect(isInterStateSupply(null, 'Karnataka')).toBe(false);
    expect(isInterStateSupply('Maharashtra', '')).toBe(false);
  });
});

describe('computeQuoteTotals', () => {
  it('splits GST into CGST and SGST for a sale within the state', () => {
    const totals = computeQuoteTotals({
      lines: [line(2, 1000, 10, 18), line(1, 500, 0, 5)],
      taxScheme: 'GST',
      isInterState: false,
    });

    expect(fromMicros(totals.grossMicros)).toBe(2500);
    expect(fromMicros(totals.discountMicros)).toBe(200);
    expect(fromMicros(totals.subtotalMicros)).toBe(2300);
    expect(
      totals.taxLines.map((taxLine) => [
        taxLine.label,
        fromMicros(taxLine.amountMicros),
      ]),
    ).toEqual([
      ['CGST 2.5%', 12.5],
      ['SGST 2.5%', 12.5],
      ['CGST 9%', 162],
      ['SGST 9%', 162],
    ]);
    expect(fromMicros(totals.taxMicros)).toBe(349);
    expect(fromMicros(totals.totalMicros)).toBe(2649);
    expect(totals.maxDiscountPercent).toBe(10);
  });

  it('charges IGST across state lines', () => {
    const totals = computeQuoteTotals({
      lines: [line(1, 1000)],
      taxScheme: 'GST',
      isInterState: true,
    });

    expect(totals.taxLines).toEqual([
      { label: 'IGST 18%', ratePercent: 18, amountMicros: toMicros(180) },
    ]);
  });

  it('keeps the CGST and SGST halves adding up to the rounded tax', () => {
    const totals = computeQuoteTotals({
      lines: [line(1, 0.35, 0, 5)],
      taxScheme: 'GST',
      isInterState: false,
    });

    expect(totals.taxMicros).toBe(toMicros(0.02));
    expect(totals.taxLines.map((taxLine) => taxLine.amountMicros)).toEqual([
      toMicros(0.01),
      toMicros(0.01),
    ]);
  });

  it('labels VAT and sales tax and skips tax entirely when there is none', () => {
    const vat = computeQuoteTotals({
      lines: [line(1, 100, 0, 5)],
      taxScheme: 'VAT',
      isInterState: false,
    });
    const salesTax = computeQuoteTotals({
      lines: [line(1, 100, 0, 8.25)],
      taxScheme: 'SALES_TAX',
      isInterState: false,
    });
    const none = computeQuoteTotals({
      lines: [line(1, 100, 0, 18)],
      taxScheme: 'NONE',
      isInterState: false,
    });

    expect(vat.taxLines[0].label).toBe('VAT 5%');
    expect(salesTax.taxLines[0].label).toBe('Sales tax 8.25%');
    expect(fromMicros(salesTax.taxMicros)).toBe(8.25);
    expect(none.taxLines).toEqual([]);
    expect(fromMicros(none.totalMicros)).toBe(100);
  });

  it('returns zeros for an empty quote', () => {
    const totals = computeQuoteTotals({
      lines: [],
      taxScheme: 'GST',
      isInterState: false,
    });

    expect(totals.totalMicros).toBe(0);
    expect(totals.maxDiscountPercent).toBe(0);
  });
});
