import { isDefined } from 'twenty-shared/utils';

import { type DiscoveryFilter } from 'src/modules/prospecting/discovery/types/discovery-capabilities.type';
import { type ProspectingIcp } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

export const getDiscoveryTopicFilters = (
  icp: ProspectingIcp,
): DiscoveryFilter[] => [
  ...(icp.targetIndustries.length > 0 ? ['industryLabel' as const] : []),
  ...(icp.industryCodes.length > 0 ? ['industryCode' as const] : []),
  ...(icp.keywords.length > 0 ? ['keyword' as const] : []),
];

export const getDiscoveryRequestFilters = ({
  icp,
  countryCode,
}: {
  icp: ProspectingIcp;
  countryCode: string | null;
}): DiscoveryFilter[] => [
  ...(isDefined(countryCode) ? ['country' as const] : []),
  ...getDiscoveryTopicFilters(icp),
  ...(isDefined(icp.employeeCountMin) || isDefined(icp.employeeCountMax)
    ? ['employeeCount' as const]
    : []),
];
