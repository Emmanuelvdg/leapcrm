import { type PROSPECTING_ICP_INDUSTRY_CODE_SCHEMES } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

export type DiscoveryFilter =
  | 'country'
  | 'industryLabel'
  | 'industryCode'
  | 'keyword'
  | 'employeeCount';

export type DiscoveryRecordField =
  | 'domain'
  | 'region'
  | 'registrationNumber'
  | 'lei'
  | 'industry'
  | 'industryCode'
  | 'employeeCount'
  | 'description';

export type DiscoveryCostModel =
  | { kind: 'FREE' }
  | {
      kind: 'METERED_PER_REQUEST' | 'METERED_PER_RECORD';
      unitPriceMicros: number;
    };

export type DiscoveryLicence = {
  id: string;
  attribution: string | null;
  isShareAlike: boolean;
  termsUrl: string | null;
};

export type DiscoveryCapabilities = {
  markets: 'GLOBAL' | readonly string[];
  filters: readonly DiscoveryFilter[];
  // A request must carry at least one of these, otherwise the provider would
  // page through its whole dataset.
  requiredFilters: readonly DiscoveryFilter[];
  industryCodeSchemes: readonly (typeof PROSPECTING_ICP_INDUSTRY_CODE_SCHEMES)[number][];
  fields: readonly DiscoveryRecordField[];
  costModel: DiscoveryCostModel;
  licence: DiscoveryLicence;
  requiresCredential: boolean;
  // Lower ranks are tried first: registries and global identifiers before
  // open knowledge, open knowledge before search.
  precisionRank: number;
  isAutoSelectable: boolean;
  // Only public sources whose terms allow reuse may feed the shared
  // directory; test data and customer files never do.
  isDirectoryShareable: boolean;
};
