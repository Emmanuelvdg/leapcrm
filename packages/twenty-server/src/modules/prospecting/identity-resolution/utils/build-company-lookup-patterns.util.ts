import { isDefined } from 'twenty-shared/utils';

import { type CompanyIdentity } from 'src/modules/prospecting/identity-resolution/utils/build-company-identity.util';
import { escapeSqlLikePattern } from 'src/utils/escape-sql-like-pattern.util';

// Broad ILIKE patterns that over-fetch on purpose: the database cannot apply
// the normalisation, so rows are narrowed by comparing identities afterwards.
export const buildDomainLookupPattern = (domain: string) =>
  `%${escapeSqlLikePattern(domain)}%`;

// "ACME HOLDINGS" becomes "acme%holdings%", which also finds
// "Acme Holdings Pte. Ltd." whatever its punctuation and legal form.
export const buildNameLookupPattern = (normalizedName: string) =>
  `${normalizedName
    .toLowerCase()
    .split(' ')
    .map(escapeSqlLikePattern)
    .join('%')}%`;

export const getUniqueIdentityValues = <TValue>(
  identities: CompanyIdentity[],
  getValue: (identity: CompanyIdentity) => TValue | null,
): TValue[] => [...new Set(identities.map(getValue).filter(isDefined))];
