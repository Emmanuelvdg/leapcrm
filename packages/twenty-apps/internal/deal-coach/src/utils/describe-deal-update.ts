import { type DealUpdateProposal } from 'src/utils/next-best-action-details.type';

export const formatAmount = (
  amountMicros: number,
  currencyCode: string | null,
): string => {
  const amount = amountMicros / 1_000_000;

  if (currencyCode) {
    try {
      return amount.toLocaleString('en-US', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      });
    } catch {
      return `${amount.toLocaleString('en-US')} ${currencyCode}`;
    }
  }

  return amount.toLocaleString('en-US');
};

export const describeDealUpdate = (
  dealUpdate: DealUpdateProposal,
  currencyCode: string | null,
): string[] =>
  [
    dealUpdate.stage !== null
      ? `Stage → ${dealUpdate.stageLabel ?? dealUpdate.stage}`
      : null,
    dealUpdate.closeDate !== null
      ? `Close date → ${dealUpdate.closeDate}`
      : null,
    dealUpdate.amountMicros !== null
      ? `Amount → ${formatAmount(dealUpdate.amountMicros, currencyCode)}`
      : null,
  ].filter((line): line is string => line !== null);
