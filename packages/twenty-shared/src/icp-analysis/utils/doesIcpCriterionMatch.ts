import { type IcpAttributeValue } from '@/icp-analysis/types/IcpAttributeValue';
import { type IcpCriterionMatch } from '@/icp-analysis/types/IcpCriterion';
import { isIcpAttributeValueKnown } from '@/icp-analysis/utils/isIcpAttributeValueKnown';
import { assertUnreachable } from '@/utils';

export const doesIcpCriterionMatch = (
  match: IcpCriterionMatch,
  value: IcpAttributeValue,
): boolean => {
  if (!isIcpAttributeValueKnown(value)) {
    return false;
  }

  switch (match.type) {
    case 'IN':
      if (Array.isArray(value)) {
        return value.some((item) => match.values.includes(item));
      }

      return typeof value === 'string' && match.values.includes(value);
    case 'BETWEEN':
      return (
        typeof value === 'number' &&
        (match.min === null || value >= match.min) &&
        (match.max === null || value < match.max)
      );
    case 'IS':
      return typeof value === 'boolean' && value === match.value;
    default:
      return assertUnreachable(match);
  }
};
