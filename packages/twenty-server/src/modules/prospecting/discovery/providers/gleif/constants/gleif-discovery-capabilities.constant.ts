import { type DiscoveryCapabilities } from 'src/modules/prospecting/discovery/types/discovery-capabilities.type';

// Name keywords only: GLEIF records carry no industry, size or website.
export const GLEIF_DISCOVERY_CAPABILITIES: DiscoveryCapabilities = {
  markets: 'GLOBAL',
  filters: ['country', 'keyword'],
  requiredFilters: ['country', 'keyword'],
  industryCodeSchemes: [],
  fields: ['region', 'registrationNumber', 'lei'],
  costModel: { kind: 'FREE' },
  licence: {
    id: 'CC0-1.0',
    attribution: null,
    isShareAlike: false,
    termsUrl: 'https://www.gleif.org/en/meta/lei-data-terms-of-use',
  },
  requiresCredential: false,
  precisionRank: 10,
  isAutoSelectable: true,
};
