import { type IcpAttributeValue } from '@/icp-analysis/types/IcpAttributeValue';
import { isDefined } from '@/utils';

export const isIcpAttributeValueKnown = (
  value: IcpAttributeValue,
): value is string | string[] | number | boolean => {
  if (!isDefined(value)) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
};
