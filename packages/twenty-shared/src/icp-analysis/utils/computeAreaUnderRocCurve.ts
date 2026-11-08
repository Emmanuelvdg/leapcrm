// Rank-based (Mann-Whitney) form: ties share the average rank, so a model that
// gives every row the same score reads 0.5.
export const computeAreaUnderRocCurve = (
  scoredRows: { score: number; isPositive: boolean }[],
): number | null => {
  const positiveCount = scoredRows.filter(
    ({ isPositive }) => isPositive,
  ).length;
  const negativeCount = scoredRows.length - positiveCount;

  if (positiveCount === 0 || negativeCount === 0) {
    return null;
  }

  const sortedRows = [...scoredRows].sort(
    (first, second) => first.score - second.score,
  );

  let positiveRankSum = 0;
  let tieStartIndex = 0;

  while (tieStartIndex < sortedRows.length) {
    let tieEndIndex = tieStartIndex;

    while (
      tieEndIndex + 1 < sortedRows.length &&
      sortedRows[tieEndIndex + 1].score === sortedRows[tieStartIndex].score
    ) {
      tieEndIndex++;
    }

    const averageRank = (tieStartIndex + tieEndIndex) / 2 + 1;

    for (let index = tieStartIndex; index <= tieEndIndex; index++) {
      if (sortedRows[index].isPositive) {
        positiveRankSum += averageRank;
      }
    }

    tieStartIndex = tieEndIndex + 1;
  }

  const mannWhitneyU =
    positiveRankSum - (positiveCount * (positiveCount + 1)) / 2;

  return mannWhitneyU / (positiveCount * negativeCount);
};
