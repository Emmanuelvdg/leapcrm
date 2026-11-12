import {
  type IcpAttributeValues,
  isIcpAttributeValueKnown,
} from 'twenty-shared/icp-analysis';

// A matched company is the better source; the candidate's own values fill the
// gaps, attribute by attribute.
export const mergeIcpAttributeValues = ({
  preferred,
  fallback,
}: {
  preferred: IcpAttributeValues;
  fallback: IcpAttributeValues;
}): IcpAttributeValues =>
  Object.fromEntries(
    [...new Set([...Object.keys(preferred), ...Object.keys(fallback)])].map(
      (attributeKey) => {
        const preferredValue = preferred[attributeKey] ?? null;

        return [
          attributeKey,
          isIcpAttributeValueKnown(preferredValue)
            ? preferredValue
            : (fallback[attributeKey] ?? null),
        ];
      },
    ),
  );
