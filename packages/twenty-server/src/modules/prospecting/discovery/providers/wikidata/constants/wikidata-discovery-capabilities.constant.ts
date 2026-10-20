import { type DiscoveryCapabilities } from 'src/modules/prospecting/discovery/types/discovery-capabilities.type';

// Industries and keywords are both matched against Wikidata industry items;
// coverage skews to larger, well-documented companies.
export const WIKIDATA_DISCOVERY_CAPABILITIES: DiscoveryCapabilities = {
  markets: 'GLOBAL',
  filters: ['country', 'industryLabel', 'keyword', 'employeeCount'],
  requiredFilters: ['industryLabel', 'keyword'],
  industryCodeSchemes: [],
  fields: ['domain', 'lei', 'industry', 'employeeCount', 'description'],
  costModel: { kind: 'FREE' },
  licence: {
    id: 'CC0-1.0',
    attribution: null,
    isShareAlike: false,
    termsUrl: 'https://www.wikidata.org/wiki/Wikidata:Licensing',
  },
  requiresCredential: false,
  precisionRank: 20,
  isAutoSelectable: true,
  isDirectoryShareable: true,
};
