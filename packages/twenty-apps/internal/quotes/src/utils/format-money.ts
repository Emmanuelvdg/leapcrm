import { MICROS_PER_UNIT } from 'src/utils/quote-math';

// Rupee amounts read best with Indian digit grouping (1,23,456.00).
const localeForCurrency = (currencyCode: string): string =>
  currencyCode === 'INR' ? 'en-IN' : 'en-US';

export const formatMoney = (micros: number, currencyCode: string): string => {
  const amount = micros / MICROS_PER_UNIT;

  try {
    return new Intl.NumberFormat(localeForCurrency(currencyCode), {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
};

export const formatDate = (isoDate: string | null | undefined): string => {
  if (!isoDate) {
    return '';
  }

  const date = new Date(
    isoDate.length === 10 ? `${isoDate}T00:00:00Z` : isoDate,
  );

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

export const toIsoDate = (date: Date): string =>
  date.toISOString().slice(0, 10);

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
