const Z_SCORE_95 = 1.96;

export const computeWilsonScoreInterval = ({
  successCount,
  totalCount,
}: {
  successCount: number;
  totalCount: number;
}): { lower: number; upper: number } => {
  if (totalCount === 0) {
    return { lower: 0, upper: 1 };
  }

  const proportion = successCount / totalCount;
  const zSquared = Z_SCORE_95 * Z_SCORE_95;
  const denominator = 1 + zSquared / totalCount;
  const center = (proportion + zSquared / (2 * totalCount)) / denominator;
  const margin =
    (Z_SCORE_95 *
      Math.sqrt(
        (proportion * (1 - proportion)) / totalCount +
          zSquared / (4 * totalCount * totalCount),
      )) /
    denominator;

  // The bounds are exactly 0 and 1 at the extremes; floating point lands just
  // inside, which would read as a real difference from a 0% or 100% baseline.
  return {
    lower: successCount === 0 ? 0 : Math.max(0, center - margin),
    upper: successCount === totalCount ? 1 : Math.min(1, center + margin),
  };
};
