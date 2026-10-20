import { isDefined } from 'twenty-shared/utils';

import { type CompanyDiscoveryRecord } from 'src/modules/prospecting/discovery/types/company-discovery-record.type';
import { type ProspectingIcp } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

const isExcludedDomain = (domain: string, excludedDomains: string[]) =>
  excludedDomains.some(
    (excludedDomain) =>
      domain === excludedDomain || domain.endsWith(`.${excludedDomain}`),
  );

// Unknown sizes are kept: most sources do not report headcount, and dropping
// those companies would leave registries useless for size-bounded campaigns.
const isOutsideEmployeeRange = (
  employeeCount: number | null,
  icp: ProspectingIcp,
) =>
  isDefined(employeeCount) &&
  ((isDefined(icp.employeeCountMin) && employeeCount < icp.employeeCountMin) ||
    (isDefined(icp.employeeCountMax) && employeeCount > icp.employeeCountMax));

export const filterDiscoveryRecords = ({
  records,
  icp,
}: {
  records: CompanyDiscoveryRecord[];
  icp: ProspectingIcp;
}): CompanyDiscoveryRecord[] =>
  records.filter(
    (record) =>
      !(
        isDefined(record.countryCode) &&
        icp.excludedCountryCodes.includes(record.countryCode)
      ) &&
      !(
        isDefined(record.domain) &&
        isExcludedDomain(record.domain, icp.excludedDomains)
      ) &&
      !isOutsideEmployeeRange(record.employeeCount, icp),
  );
