import { type CompanyIdentity } from 'src/modules/prospecting/identity-resolution/utils/build-company-identity.util';

export type CompanyIdentityMatch =
  | { status: 'CONFIRMED_MATCH'; matchedId: string }
  | { status: 'PROBABLE_MATCH'; matchedId: string }
  | { status: 'DISTINCT' }
  | { status: 'INSUFFICIENT_INFORMATION' };

type PairComparison = 'CONFIRMED' | 'PROBABLE' | 'NONE';

const hasKnownDifferentCountries = (
  first: CompanyIdentity,
  second: CompanyIdentity,
) =>
  first.countryCode !== null &&
  second.countryCode !== null &&
  first.countryCode !== second.countryCode;

const isSameRegistry = (first: CompanyIdentity, second: CompanyIdentity) =>
  first.registration !== null &&
  second.registration !== null &&
  first.registration.authority === second.registration.authority;

export const compareCompanyIdentities = (
  first: CompanyIdentity,
  second: CompanyIdentity,
): PairComparison => {
  const hasLeiOnBothSides = first.lei !== null && second.lei !== null;
  const hasSameRegistry = isSameRegistry(first, second);

  // Different LEIs, or different numbers in the same registry, are different
  // legal entities whatever else they share (group companies often share a
  // domain and a name).
  if (
    (hasLeiOnBothSides && first.lei !== second.lei) ||
    (hasSameRegistry &&
      first.registration?.number !== second.registration?.number)
  ) {
    return 'NONE';
  }

  if (hasLeiOnBothSides || hasSameRegistry) {
    return 'CONFIRMED';
  }

  if (first.domain !== null && first.domain === second.domain) {
    if (hasKnownDifferentCountries(first, second)) {
      return 'NONE';
    }

    return first.countryCode !== null && second.countryCode !== null
      ? 'CONFIRMED'
      : 'PROBABLE';
  }

  const hasDifferentDomains =
    first.domain !== null &&
    second.domain !== null &&
    first.domain !== second.domain;

  if (
    first.normalizedName !== null &&
    first.normalizedName === second.normalizedName &&
    !hasKnownDifferentCountries(first, second) &&
    !hasDifferentDomains
  ) {
    return 'PROBABLE';
  }

  return 'NONE';
};

const hasComparableIdentifier = (identity: CompanyIdentity) =>
  identity.lei !== null ||
  identity.registration !== null ||
  identity.domain !== null;

export const matchCompanyIdentity = ({
  identity,
  existingIdentities,
}: {
  identity: CompanyIdentity;
  existingIdentities: { id: string; identity: CompanyIdentity }[];
}): CompanyIdentityMatch => {
  const comparisons = [...existingIdentities]
    .sort((first, second) => first.id.localeCompare(second.id))
    .map((existing) => ({
      id: existing.id,
      comparison: compareCompanyIdentities(identity, existing.identity),
    }));

  const confirmedMatch = comparisons.find(
    ({ comparison }) => comparison === 'CONFIRMED',
  );

  if (confirmedMatch) {
    return { status: 'CONFIRMED_MATCH', matchedId: confirmedMatch.id };
  }

  const probableMatch = comparisons.find(
    ({ comparison }) => comparison === 'PROBABLE',
  );

  if (probableMatch) {
    return { status: 'PROBABLE_MATCH', matchedId: probableMatch.id };
  }

  return hasComparableIdentifier(identity)
    ? { status: 'DISTINCT' }
    : { status: 'INSUFFICIENT_INFORMATION' };
};
