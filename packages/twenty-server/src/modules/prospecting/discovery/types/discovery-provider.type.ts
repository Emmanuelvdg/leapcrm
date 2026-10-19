import { type CompanyDiscoveryRecord } from 'src/modules/prospecting/discovery/types/company-discovery-record.type';
import { type DiscoveryCapabilities } from 'src/modules/prospecting/discovery/types/discovery-capabilities.type';
import { type ProspectingIcp } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

export type DiscoveryRequest = {
  countryCode: string | null;
  icp: ProspectingIcp;
  cursor: string | null;
  pageSize: number;
};

export type DiscoveryContext = {
  workspaceId: string;
  campaignId: string;
};

export type DiscoveryPage = {
  records: CompanyDiscoveryRecord[];
  nextCursor: string | null;
};

export type DiscoveryProvider = {
  readonly id: string;
  getCapabilities: () => DiscoveryCapabilities;
  search: (
    request: DiscoveryRequest,
    context: DiscoveryContext,
  ) => Promise<DiscoveryPage>;
};
