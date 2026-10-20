import { createHash } from 'crypto';

import { type DiscoveredCompany } from 'src/modules/prospecting/candidate/types/discovered-company.type';
import { buildCandidateSource } from 'src/modules/prospecting/candidate/utils/build-candidate-source.util';
import { type CompanyDiscoveryRecord } from 'src/modules/prospecting/discovery/types/company-discovery-record.type';
import { normalizeCompanyDomain } from 'src/modules/prospecting/identity-resolution/utils/normalize-company-domain.util';
import { normalizeCountryCode } from 'src/modules/prospecting/identity-resolution/utils/normalize-country-code.util';

export const CUSTOMER_IMPORT_PROVIDER_ID = 'customer-import';

export type CustomerImportRow = {
  name: string;
  domain?: string | null;
  country?: string | null;
  registrationNumber?: string | null;
  registrationAuthority?: string | null;
  lei?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
};

const trimToNull = (value: string | null | undefined): string | null => {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
};

// The external id is derived from the row content, so importing the same
// file twice lands on the same candidates instead of duplicating them.
const buildCustomerImportExternalId = (row: CustomerImportRow) =>
  createHash('sha256')
    .update(
      [
        row.name,
        row.domain,
        row.country,
        row.registrationAuthority,
        row.registrationNumber,
        row.lei,
      ]
        .map((value) => value?.trim().toLowerCase() ?? '')
        .join('|'),
    )
    .digest('hex')
    .slice(0, 32);

// Customer files stay in the workspace: they are unverified and confidential,
// so they are never written to the shared directory.
export const normalizeCustomerImportRow = ({
  row,
  importedAt,
}: {
  row: CustomerImportRow;
  importedAt: string;
}): DiscoveredCompany => {
  const record: CompanyDiscoveryRecord = {
    providerId: CUSTOMER_IMPORT_PROVIDER_ID,
    externalId: buildCustomerImportExternalId(row),
    sourceUrl: null,
    licenceId: 'customer-provided',
    retrievedAt: importedAt,
    name: row.name.trim(),
    domain: normalizeCompanyDomain(row.domain),
    countryCode: normalizeCountryCode(row.country) ?? trimToNull(row.country),
    region: null,
    registrationAuthority: trimToNull(row.registrationAuthority),
    registrationNumber: trimToNull(row.registrationNumber),
    lei: trimToNull(row.lei),
    industry: trimToNull(row.industry),
    industryCode: null,
    employeeCount: row.employeeCount ?? null,
    description: null,
  };

  return { record, sources: [buildCandidateSource(record)] };
};
