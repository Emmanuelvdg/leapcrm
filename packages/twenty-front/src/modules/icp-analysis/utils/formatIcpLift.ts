import { isDefined } from 'twenty-shared/utils';

export const formatIcpLift = (lift: number | null | undefined): string =>
  isDefined(lift) ? `${lift.toFixed(1)}x` : '-';
