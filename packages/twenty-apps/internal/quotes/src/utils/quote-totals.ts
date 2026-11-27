import { type TaxScheme } from 'src/constants/quote-options';
import {
  computeQuoteTotals,
  isInterStateSupply,
  type QuoteLineInput,
  type QuoteTotals,
} from 'src/utils/quote-math';

export const computeTotalsFor = ({
  lines,
  taxScheme,
  sellerState,
  placeOfSupply,
}: {
  lines: QuoteLineInput[];
  taxScheme: TaxScheme;
  sellerState: string | null;
  placeOfSupply: string | null;
}): QuoteTotals =>
  computeQuoteTotals({
    lines,
    taxScheme,
    isInterState:
      taxScheme === 'GST' && isInterStateSupply(sellerState, placeOfSupply),
  });

const money = (amountMicros: number, currencyCode: string) => ({
  amountMicros,
  currencyCode,
});

// The stored totals are what views, filters and workflows see; they are
// rewritten whenever the lines are saved and again when the quote is sent.
export const totalsToQuoteData = (
  totals: QuoteTotals,
  currencyCode: string,
): Record<string, unknown> => ({
  subtotal: money(totals.subtotalMicros, currencyCode),
  discountTotal: money(totals.discountMicros, currencyCode),
  taxTotal: money(totals.taxMicros, currencyCode),
  total: money(totals.totalMicros, currencyCode),
  maxDiscountPercent: totals.maxDiscountPercent,
});
