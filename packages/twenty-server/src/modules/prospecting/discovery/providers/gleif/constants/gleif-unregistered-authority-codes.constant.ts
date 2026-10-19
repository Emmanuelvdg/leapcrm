// GLEIF placeholders for "no registration authority" and "authority not in
// the list"; they identify nothing, so they must never be used to match.
export const GLEIF_UNREGISTERED_AUTHORITY_CODES = new Set([
  'RA999999',
  'RA888888',
]);
