import { type DiscoveryCapabilities } from 'src/modules/prospecting/discovery/types/discovery-capabilities.type';

// The UK statutory register: authoritative ids and SIC codes, no websites or
// sizes. Company facts on the public register come with no reuse
// restrictions (they are published under statute, not a licence); officer
// data is never requested.
export const COMPANIES_HOUSE_DISCOVERY_CAPABILITIES: DiscoveryCapabilities = {
  markets: ['GB'],
  filters: ['country', 'keyword', 'industryCode'],
  requiredFilters: ['keyword', 'industryCode'],
  industryCodeSchemes: ['SIC'],
  fields: ['region', 'registrationNumber', 'industryCode'],
  costModel: { kind: 'FREE' },
  licence: {
    id: 'companies-house-public-register',
    attribution: 'Contains information from Companies House',
    isShareAlike: false,
    termsUrl:
      'https://developer.company-information.service.gov.uk/developer-guidelines',
  },
  requiresCredential: true,
  precisionRank: 5,
  isAutoSelectable: true,
  isDirectoryShareable: true,
};
