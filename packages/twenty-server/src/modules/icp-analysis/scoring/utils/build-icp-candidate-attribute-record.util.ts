import { isNonEmptyString } from '@sniptt/guards';

import { type ProspectCandidateWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospect-candidate.workspace-entity';

const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/;

// Company addresses hold the English country name the address input picks
// from this same list, while discovery stores ISO codes.
const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

const toCountryName = (country: string | null): string | null => {
  if (!isNonEmptyString(country)) {
    return null;
  }

  const trimmedCountry = country.trim();

  if (!COUNTRY_CODE_PATTERN.test(trimmedCountry)) {
    return trimmedCountry;
  }

  try {
    return REGION_NAMES.of(trimmedCountry.toUpperCase()) ?? trimmedCountry;
  } catch {
    return trimmedCountry;
  }
};

// A candidate's own firmographics, shaped like the company fields they mean,
// so criteria written against companies apply. Registry industries use other
// taxonomies than company industries, so industry is left unknown.
export const buildIcpCandidateAttributeRecord = (
  candidate: Pick<
    ProspectCandidateWorkspaceEntity,
    'country' | 'employeeCount'
  >,
): Record<string, unknown> => ({
  address: { addressCountry: toCountryName(candidate.country) },
  employees: candidate.employeeCount,
});
