import { isDefined } from 'twenty-shared/utils';

export const formatIcpRate = (rate: number | null | undefined): string =>
  isDefined(rate) ? `${Math.round(rate * 100)}%` : '-';
