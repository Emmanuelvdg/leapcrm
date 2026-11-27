import { type TaxScheme } from 'src/constants/quote-options';

export const MICROS_PER_UNIT = 1_000_000;

const MICROS_PER_CENT = 10_000;

export type QuoteLineInput = {
  quantity: number;
  unitPriceMicros: number;
  discountPercent: number;
  taxRate: number;
};

export type QuoteLineAmounts = {
  grossMicros: number;
  discountMicros: number;
  netMicros: number;
};

export type TaxLine = {
  label: string;
  ratePercent: number;
  amountMicros: number;
};

export type QuoteTotals = {
  lines: QuoteLineAmounts[];
  grossMicros: number;
  discountMicros: number;
  subtotalMicros: number;
  taxLines: TaxLine[];
  taxMicros: number;
  totalMicros: number;
  maxDiscountPercent: number;
};

export const roundToCents = (micros: number): number =>
  Math.round(micros / MICROS_PER_CENT) * MICROS_PER_CENT;

export const toMicros = (amount: number): number =>
  Number.isFinite(amount) ? roundToCents(amount * MICROS_PER_UNIT) : 0;

export const fromMicros = (micros: number): number =>
  Math.round(micros / MICROS_PER_CENT) / 100;

export const clampPercent = (value: number): number =>
  Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;

const clampQuantity = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

export const formatRate = (rate: number): string =>
  String(Math.round(rate * 100) / 100);

export const computeLineAmounts = (line: QuoteLineInput): QuoteLineAmounts => {
  const grossMicros = roundToCents(
    clampQuantity(line.quantity) * Math.max(0, line.unitPriceMicros || 0),
  );
  const discountMicros = roundToCents(
    (grossMicros * clampPercent(line.discountPercent)) / 100,
  );

  return {
    grossMicros,
    discountMicros,
    netMicros: grossMicros - discountMicros,
  };
};

const normalizeState = (state: string | null | undefined): string =>
  (state ?? '').trim().toLowerCase();

// GST is split into CGST and SGST when the customer is in the seller's own
// state, and charged as IGST across state lines or outside India. With either
// state unknown the quote is treated as a local sale, the common case.
export const isInterStateSupply = (
  sellerState: string | null | undefined,
  placeOfSupply: string | null | undefined,
): boolean => {
  const seller = normalizeState(sellerState);
  const customer = normalizeState(placeOfSupply);

  return seller !== '' && customer !== '' && seller !== customer;
};

const buildTaxLines = ({
  scheme,
  ratePercent,
  taxMicros,
  isInterState,
}: {
  scheme: TaxScheme;
  ratePercent: number;
  taxMicros: number;
  isInterState: boolean;
}): TaxLine[] => {
  if (scheme === 'GST') {
    if (isInterState) {
      return [
        {
          label: `IGST ${formatRate(ratePercent)}%`,
          ratePercent,
          amountMicros: taxMicros,
        },
      ];
    }

    const centralMicros = roundToCents(taxMicros / 2);
    const halfRate = ratePercent / 2;

    return [
      {
        label: `CGST ${formatRate(halfRate)}%`,
        ratePercent: halfRate,
        amountMicros: centralMicros,
      },
      {
        label: `SGST ${formatRate(halfRate)}%`,
        ratePercent: halfRate,
        amountMicros: taxMicros - centralMicros,
      },
    ];
  }

  const schemeLabel = scheme === 'VAT' ? 'VAT' : 'Sales tax';

  return [
    {
      label: `${schemeLabel} ${formatRate(ratePercent)}%`,
      ratePercent,
      amountMicros: taxMicros,
    },
  ];
};

// Tax is worked out once per rate on the summed taxable value, as on a GST
// invoice, so rounding does not drift line by line.
export const computeQuoteTotals = ({
  lines,
  taxScheme,
  isInterState,
}: {
  lines: QuoteLineInput[];
  taxScheme: TaxScheme;
  isInterState: boolean;
}): QuoteTotals => {
  const lineAmounts = lines.map(computeLineAmounts);
  const netByRate = new Map<number, number>();

  lines.forEach((line, index) => {
    const rate = clampPercent(line.taxRate);

    if (taxScheme === 'NONE' || rate === 0) {
      return;
    }

    netByRate.set(
      rate,
      (netByRate.get(rate) ?? 0) + lineAmounts[index].netMicros,
    );
  });

  const taxLines = [...netByRate.entries()]
    .sort(([rateA], [rateB]) => rateA - rateB)
    .flatMap(([ratePercent, netMicros]) =>
      buildTaxLines({
        scheme: taxScheme,
        ratePercent,
        taxMicros: roundToCents((netMicros * ratePercent) / 100),
        isInterState,
      }),
    )
    .filter((taxLine) => taxLine.amountMicros !== 0);

  const sum = (values: number[]) =>
    values.reduce((total, value) => total + value, 0);

  const grossMicros = sum(lineAmounts.map((line) => line.grossMicros));
  const discountMicros = sum(lineAmounts.map((line) => line.discountMicros));
  const subtotalMicros = grossMicros - discountMicros;
  const taxMicros = sum(taxLines.map((taxLine) => taxLine.amountMicros));

  return {
    lines: lineAmounts,
    grossMicros,
    discountMicros,
    subtotalMicros,
    taxLines,
    taxMicros,
    totalMicros: subtotalMicros + taxMicros,
    maxDiscountPercent: lines.reduce(
      (highest, line) => Math.max(highest, clampPercent(line.discountPercent)),
      0,
    ),
  };
};
