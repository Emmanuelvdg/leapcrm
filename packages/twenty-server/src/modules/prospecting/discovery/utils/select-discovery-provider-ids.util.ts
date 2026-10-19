import { type DiscoveryCapabilities } from 'src/modules/prospecting/discovery/types/discovery-capabilities.type';
import { type DiscoveryProvider } from 'src/modules/prospecting/discovery/types/discovery-provider.type';
import {
  getDiscoveryRequestFilters,
  getDiscoveryTopicFilters,
} from 'src/modules/prospecting/discovery/utils/get-discovery-request-filters.util';
import { type ProspectingIcp } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

const coversIcpMarkets = (
  capabilities: DiscoveryCapabilities,
  icp: ProspectingIcp,
): boolean => {
  if (capabilities.markets === 'GLOBAL') {
    return true;
  }

  const providerMarkets = capabilities.markets;

  return icp.targetGeographies.some((geography) =>
    providerMarkets.includes(geography.countryCode),
  );
};

// Topic criteria (industries, industry codes, keywords) are alternatives, so a
// provider qualifies when it honours at least one of those the ICP uses.
// Size and region are not required: sources without them return candidates
// with unknown values, which later research fills in.
const honoursIcpTopic = (
  capabilities: DiscoveryCapabilities,
  icp: ProspectingIcp,
): boolean => {
  const topicFilters = getDiscoveryTopicFilters(icp);

  if (topicFilters.length === 0) {
    return true;
  }

  return topicFilters.some((topicFilter) => {
    if (!capabilities.filters.includes(topicFilter)) {
      return false;
    }

    if (topicFilter !== 'industryCode') {
      return true;
    }

    return icp.industryCodes.some((industryCode) =>
      capabilities.industryCodeSchemes.includes(industryCode.scheme),
    );
  });
};

const hasRequiredFilter = (
  capabilities: DiscoveryCapabilities,
  icp: ProspectingIcp,
): boolean => {
  if (capabilities.requiredFilters.length === 0) {
    return true;
  }

  const icpFilters = getDiscoveryRequestFilters({
    icp,
    countryCode: icp.targetGeographies[0]?.countryCode ?? null,
  });

  return capabilities.requiredFilters.some((requiredFilter) =>
    icpFilters.includes(requiredFilter),
  );
};

export const selectDiscoveryProviderIds = ({
  icp,
  providers,
}: {
  icp: ProspectingIcp;
  providers: DiscoveryProvider[];
}): string[] =>
  providers
    .map((provider) => ({
      id: provider.id,
      capabilities: provider.getCapabilities(),
    }))
    .filter(
      ({ capabilities }) =>
        capabilities.isAutoSelectable &&
        coversIcpMarkets(capabilities, icp) &&
        honoursIcpTopic(capabilities, icp) &&
        hasRequiredFilter(capabilities, icp),
    )
    .sort(
      (first, second) =>
        first.capabilities.precisionRank - second.capabilities.precisionRank ||
        Number(first.capabilities.costModel.kind !== 'FREE') -
          Number(second.capabilities.costModel.kind !== 'FREE') ||
        first.id.localeCompare(second.id),
    )
    .map(({ id }) => id);
