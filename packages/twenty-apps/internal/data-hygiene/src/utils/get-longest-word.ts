export const getLongestWord = (value: string): string =>
  value
    .split(' ')
    .reduce(
      (longest, word) => (word.length > longest.length ? word : longest),
      '',
    );
