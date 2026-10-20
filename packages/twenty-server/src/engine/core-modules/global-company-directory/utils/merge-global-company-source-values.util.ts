import { isDefined } from 'twenty-shared/utils';

import { type GlobalCompanyValues } from 'src/engine/core-modules/global-company-directory/types/global-company-values.type';

type RankedSourceValues = {
  sourceRank: number;
  retrievedAt: Date;
  values: GlobalCompanyValues;
};

// Each field comes from the most precise source that has it, and among equally
// precise sources from the most recent one, so a less reliable or older value
// never replaces a better one.
export const mergeGlobalCompanySourceValues = (
  sources: RankedSourceValues[],
): GlobalCompanyValues => {
  const orderedValues = [...sources]
    .sort(
      (first, second) =>
        first.sourceRank - second.sourceRank ||
        second.retrievedAt.getTime() - first.retrievedAt.getTime(),
    )
    .map(({ values }) => values);

  const pick = <TField extends keyof GlobalCompanyValues>(
    field: TField,
  ): GlobalCompanyValues[TField] | null =>
    orderedValues.map((values) => values[field]).find(isDefined) ?? null;

  return {
    name: pick('name') ?? '',
    normalizedName: pick('normalizedName'),
    countryCode: pick('countryCode'),
    region: pick('region'),
    canonicalDomain: pick('canonicalDomain'),
    lei: pick('lei'),
    registrationAuthority: pick('registrationAuthority'),
    registrationNumber: pick('registrationNumber'),
    industry: pick('industry'),
    industryCode: pick('industryCode'),
    industryCodeScheme: pick('industryCodeScheme'),
    employeeCount: pick('employeeCount'),
    description: pick('description'),
  };
};
