import { ICP_MAX_NUMERIC_BAND_COUNT } from '@/icp-analysis/constants/IcpMaxNumericBandCount';
import { type IcpNumericBand } from '@/icp-analysis/types/IcpNumericBand';

// Raw quantiles give edges like 153 or 1,234; two significant digits make
// them 150 or 1,200 so band labels read naturally.
const roundToTwoSignificantDigits = (value: number): number =>
  Number(value.toPrecision(2));

export const bucketIcpNumericValues = ({
  values,
  maxBandCount = ICP_MAX_NUMERIC_BAND_COUNT,
}: {
  values: number[];
  maxBandCount?: number;
}): IcpNumericBand[] => {
  const sortedValues = values
    .filter((value) => Number.isFinite(value))
    .sort((first, second) => first - second);

  if (sortedValues.length === 0) {
    return [];
  }

  const minimumValue = sortedValues[0];
  const maximumValue = sortedValues[sortedValues.length - 1];
  const edges: number[] = [];

  for (let bandIndex = 1; bandIndex < maxBandCount; bandIndex++) {
    const quantileValue =
      sortedValues[
        Math.floor((bandIndex * sortedValues.length) / maxBandCount)
      ];
    const edge = roundToTwoSignificantDigits(quantileValue);
    const previousEdge = edges[edges.length - 1];

    if (
      edge > minimumValue &&
      edge <= maximumValue &&
      (previousEdge === undefined || edge > previousEdge)
    ) {
      edges.push(edge);
    }
  }

  if (edges.length === 0) {
    return [{ min: null, max: null }];
  }

  return [
    { min: null, max: edges[0] },
    ...edges.slice(1).map((edge, index) => ({ min: edges[index], max: edge })),
    { min: edges[edges.length - 1], max: null },
  ];
};
