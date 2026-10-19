import { type DiscoveryCapabilities } from 'src/modules/prospecting/discovery/types/discovery-capabilities.type';

// Deterministic offline records for tests and local development. Never picked
// automatically and not registered in production.
export const FIXTURE_DISCOVERY_CAPABILITIES: DiscoveryCapabilities = {
  markets: 'GLOBAL',
  filters: ['country', 'industryLabel', 'keyword', 'employeeCount'],
  requiredFilters: [],
  industryCodeSchemes: [],
  fields: ['domain', 'industry', 'employeeCount', 'description'],
  costModel: { kind: 'FREE' },
  licence: {
    id: 'fixture',
    attribution: null,
    isShareAlike: false,
    termsUrl: null,
  },
  requiresCredential: false,
  precisionRank: 100,
  isAutoSelectable: false,
};
