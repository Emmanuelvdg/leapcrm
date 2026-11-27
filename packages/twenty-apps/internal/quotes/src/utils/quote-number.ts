export const getQuoteNumberHead = (prefix: string, year: number): string =>
  `${prefix}-${year}-`;

// Numbers restart each year: Q-2026-0001, Q-2026-0002, ...
export const nextQuoteNumber = ({
  prefix,
  year,
  existingNumbers,
}: {
  prefix: string;
  year: number;
  existingNumbers: (string | null | undefined)[];
}): string => {
  const head = getQuoteNumberHead(prefix, year);

  const highest = existingNumbers.reduce<number>((max, quoteNumber) => {
    if (!quoteNumber?.startsWith(head)) {
      return max;
    }

    const sequence = Number(quoteNumber.slice(head.length));

    return Number.isInteger(sequence) ? Math.max(max, sequence) : max;
  }, 0);

  return `${head}${String(highest + 1).padStart(4, '0')}`;
};
