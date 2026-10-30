import { isNonEmptyString } from '@sniptt/guards';

import { COMPANIES_HOUSE_DISCOVERY_CAPABILITIES } from 'src/modules/prospecting/discovery/providers/companies-house/constants/companies-house-discovery-capabilities.constant';
import { COMPANIES_HOUSE_DISCOVERY_PROVIDER_ID } from 'src/modules/prospecting/discovery/providers/companies-house/constants/companies-house-discovery-provider-id.constant';
import { getCompaniesHouseRegistrationAuthority } from 'src/modules/prospecting/discovery/providers/companies-house/utils/get-companies-house-registration-authority.util';
import { type CompaniesHouseCompany } from 'src/modules/prospecting/discovery/providers/companies-house/zod-schemas/companies-house-advanced-search-response.zod-schema';
import { type CompanyDiscoveryRecord } from 'src/modules/prospecting/discovery/types/company-discovery-record.type';

export const mapCompaniesHouseCompany = ({
  company,
  requestedSicCodes,
  retrievedAt,
}: {
  company: CompaniesHouseCompany;
  requestedSicCodes: string[];
  retrievedAt: string;
}): CompanyDiscoveryRecord => {
  const companyNumber = company.company_number.trim().toUpperCase();
  const sicCodes = company.sic_codes ?? [];
  // The code the campaign asked for is the one worth showing when a company
  // lists several.
  const sicCode =
    sicCodes.find((code) => requestedSicCodes.includes(code)) ?? sicCodes[0];
  const address = company.registered_office_address;

  return {
    providerId: COMPANIES_HOUSE_DISCOVERY_PROVIDER_ID,
    externalId: companyNumber,
    sourceUrl: `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}`,
    licenceId: COMPANIES_HOUSE_DISCOVERY_CAPABILITIES.licence.id,
    retrievedAt,
    name: company.company_name.trim(),
    domain: null,
    countryCode: 'GB',
    region: address?.region ?? address?.country ?? null,
    registrationAuthority:
      getCompaniesHouseRegistrationAuthority(companyNumber),
    registrationNumber: companyNumber,
    lei: null,
    industry: null,
    industryCode: isNonEmptyString(sicCode)
      ? { scheme: 'SIC', code: sicCode }
      : null,
    employeeCount: null,
    description: null,
  };
};
