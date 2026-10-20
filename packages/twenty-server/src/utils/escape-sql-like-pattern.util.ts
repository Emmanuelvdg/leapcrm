// Postgres LIKE and ILIKE treat backslash as the escape character by default,
// so user text can be embedded in a pattern without acting as a wildcard.
export const escapeSqlLikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, (character) => `\\${character}`);
