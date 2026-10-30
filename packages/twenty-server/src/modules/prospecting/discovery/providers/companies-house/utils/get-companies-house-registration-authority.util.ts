// GLEIF codes the three Companies House registers separately; the company
// number prefix says which one holds the company.
const SCOTLAND_PREFIXES = new Set([
  'SA',
  'SC',
  'SF',
  'SG',
  'SL',
  'SO',
  'SP',
  'SR',
  'SZ',
]);

const NORTHERN_IRELAND_PREFIXES = new Set([
  'NA',
  'NC',
  'NF',
  'NI',
  'NL',
  'NO',
  'NP',
  'NR',
  'NZ',
]);

export const getCompaniesHouseRegistrationAuthority = (
  companyNumber: string,
): string => {
  const normalizedNumber = companyNumber.trim().toUpperCase();
  const prefix = normalizedNumber.slice(0, 2);

  if (SCOTLAND_PREFIXES.has(prefix)) {
    return 'RA000587';
  }

  if (
    NORTHERN_IRELAND_PREFIXES.has(prefix) ||
    /^R\d{7}$/.test(normalizedNumber)
  ) {
    return 'RA000586';
  }

  return 'RA000585';
};
