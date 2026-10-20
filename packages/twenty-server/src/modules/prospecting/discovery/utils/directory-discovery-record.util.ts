import { isDefined } from 'twenty-shared/utils';

import { type DirectoryCompany } from 'src/engine/core-modules/global-company-directory/services/global-company-directory.service';
import { type PublicCompanyObservation } from 'src/engine/core-modules/global-company-directory/types/global-company-values.type';
import { type DiscoveredCompany } from 'src/modules/prospecting/candidate/types/discovered-company.type';
import { type CompanyDiscoveryRecord } from 'src/modules/prospecting/discovery/types/company-discovery-record.type';
import { buildCompanyIdentity } from 'src/modules/prospecting/identity-resolution/utils/build-company-identity.util';

// A directory entry reaches the tenant as an ordinary discovery, credited to
// the public sources the facts came from. The most precise source is the
// primary provenance; every source is listed.
export const mapDirectoryCompanyToDiscoveredCompany = ({
  globalCompany,
  sources,
}: DirectoryCompany): DiscoveredCompany | null => {
  const [primarySource] = sources;

  if (!isDefined(primarySource)) {
    return null;
  }

  return {
    record: {
      providerId: primarySource.providerId,
      externalId: primarySource.externalId,
      sourceUrl: primarySource.sourceUrl,
      licenceId: primarySource.licenceId,
      retrievedAt: primarySource.retrievedAt.toISOString(),
      name: globalCompany.name,
      domain: globalCompany.canonicalDomain,
      countryCode: globalCompany.countryCode,
      region: globalCompany.region,
      registrationAuthority: globalCompany.registrationAuthority,
      registrationNumber: globalCompany.registrationNumber,
      lei: globalCompany.lei,
      industry: globalCompany.industry,
      industryCode:
        isDefined(globalCompany.industryCode) &&
        isDefined(globalCompany.industryCodeScheme)
          ? {
              scheme: globalCompany.industryCodeScheme,
              code: globalCompany.industryCode,
            }
          : null,
      employeeCount: globalCompany.employeeCount,
      description: globalCompany.description,
    },
    sources: sources.map((source) => ({
      providerId: source.providerId,
      externalId: source.externalId,
      sourceUrl: source.sourceUrl,
      licenceId: source.licenceId,
      retrievedAt: source.retrievedAt.toISOString(),
    })),
  };
};

export const buildPublicCompanyObservation = ({
  record,
  sourceRank,
}: {
  record: CompanyDiscoveryRecord;
  sourceRank: number;
}): PublicCompanyObservation => {
  const identity = buildCompanyIdentity({
    name: record.name,
    lei: record.lei,
    registrationAuthority: record.registrationAuthority,
    registrationNumber: record.registrationNumber,
    domain: record.domain,
    country: record.countryCode,
  });

  return {
    providerId: record.providerId,
    externalId: record.externalId,
    sourceUrl: record.sourceUrl,
    licenceId: record.licenceId,
    retrievedAt: new Date(record.retrievedAt),
    sourceRank,
    values: {
      name: record.name,
      normalizedName: identity.normalizedName,
      countryCode: identity.countryCode,
      region: record.region,
      canonicalDomain: identity.domain,
      lei: identity.lei,
      registrationAuthority: identity.registration?.authority ?? null,
      registrationNumber: identity.registration?.number ?? null,
      industry: record.industry,
      industryCode: record.industryCode?.code ?? null,
      industryCodeScheme: record.industryCode?.scheme ?? null,
      employeeCount: record.employeeCount,
      description: record.description,
    },
  };
};
