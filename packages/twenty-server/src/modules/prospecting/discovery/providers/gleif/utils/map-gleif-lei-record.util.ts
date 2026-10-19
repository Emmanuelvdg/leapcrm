import { isNonEmptyString } from '@sniptt/guards';

import { GLEIF_DISCOVERY_CAPABILITIES } from 'src/modules/prospecting/discovery/providers/gleif/constants/gleif-discovery-capabilities.constant';
import { GLEIF_DISCOVERY_PROVIDER_ID } from 'src/modules/prospecting/discovery/providers/gleif/constants/gleif-discovery-provider-id.constant';
import { GLEIF_UNREGISTERED_AUTHORITY_CODES } from 'src/modules/prospecting/discovery/providers/gleif/constants/gleif-unregistered-authority-codes.constant';
import { type GleifLeiRecord } from 'src/modules/prospecting/discovery/providers/gleif/zod-schemas/gleif-lei-records-response.zod-schema';
import { type CompanyDiscoveryRecord } from 'src/modules/prospecting/discovery/types/company-discovery-record.type';

export const mapGleifLeiRecord = ({
  record,
  retrievedAt,
}: {
  record: GleifLeiRecord;
  retrievedAt: string;
}): CompanyDiscoveryRecord => {
  const { lei, entity } = record.attributes;
  const authorityCode = entity.registeredAt?.id ?? null;
  const registrationAuthority =
    isNonEmptyString(authorityCode) &&
    !GLEIF_UNREGISTERED_AUTHORITY_CODES.has(authorityCode)
      ? authorityCode
      : null;
  const registrationNumber = entity.registeredAs?.trim() ?? '';

  return {
    providerId: GLEIF_DISCOVERY_PROVIDER_ID,
    externalId: lei,
    sourceUrl: `https://search.gleif.org/#/record/${lei}`,
    licenceId: GLEIF_DISCOVERY_CAPABILITIES.licence.id,
    retrievedAt,
    name: entity.legalName.name.trim(),
    domain: null,
    countryCode: entity.legalAddress.country,
    region: entity.legalAddress.region,
    registrationAuthority,
    registrationNumber:
      registrationAuthority !== null && registrationNumber.length > 0
        ? registrationNumber
        : null,
    lei,
    industry: null,
    industryCode: null,
    employeeCount: null,
    description: null,
  };
};
