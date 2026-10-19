import { isNonEmptyString } from '@sniptt/guards';

import { WIKIDATA_DISCOVERY_CAPABILITIES } from 'src/modules/prospecting/discovery/providers/wikidata/constants/wikidata-discovery-capabilities.constant';
import { WIKIDATA_DISCOVERY_PROVIDER_ID } from 'src/modules/prospecting/discovery/providers/wikidata/constants/wikidata-discovery-provider-id.constant';
import { type WikidataCompanyBinding } from 'src/modules/prospecting/discovery/providers/wikidata/zod-schemas/wikidata-company-search-response.zod-schema';
import { type CompanyDiscoveryRecord } from 'src/modules/prospecting/discovery/types/company-discovery-record.type';
import { extractDiscoveryDomain } from 'src/modules/prospecting/discovery/utils/extract-discovery-domain.util';

const parseEmployeeCount = (value: string | undefined): number | null => {
  const employeeCount = Number(value);

  return isNonEmptyString(value) &&
    Number.isFinite(employeeCount) &&
    employeeCount >= 0
    ? Math.round(employeeCount)
    : null;
};

// Returns null for items without an English label: there is no name to show
// or to match on.
export const mapWikidataCompanyBinding = ({
  binding,
  countryCode,
  retrievedAt,
}: {
  binding: WikidataCompanyBinding;
  countryCode: string | null;
  retrievedAt: string;
}): CompanyDiscoveryRecord | null => {
  const name = binding.name?.value.trim();
  const itemId = binding.item.value.split('/').pop();

  if (!isNonEmptyString(name) || !isNonEmptyString(itemId)) {
    return null;
  }

  const industries = (binding.industries?.value ?? '')
    .split('|')
    .map((industry) => industry.trim())
    .filter(isNonEmptyString);
  const lei = binding.leiCode?.value.trim().toUpperCase();

  return {
    providerId: WIKIDATA_DISCOVERY_PROVIDER_ID,
    externalId: itemId,
    sourceUrl: `https://www.wikidata.org/wiki/${itemId}`,
    licenceId: WIKIDATA_DISCOVERY_CAPABILITIES.licence.id,
    retrievedAt,
    name,
    domain: extractDiscoveryDomain(binding.officialWebsite?.value),
    countryCode,
    region: null,
    registrationAuthority: null,
    registrationNumber: null,
    lei: isNonEmptyString(lei) ? lei : null,
    industry: industries.length > 0 ? industries.join(', ') : null,
    industryCode: null,
    employeeCount: parseEmployeeCount(binding.employeeCount?.value),
    description: binding.itemDescription?.value.trim() || null,
  };
};
