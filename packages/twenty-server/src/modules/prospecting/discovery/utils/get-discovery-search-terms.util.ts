import { DISCOVERY_SEARCH_TERM_MAX_COUNT } from 'src/modules/prospecting/discovery/constants/discovery-search-term-max-count.constant';

export const getDiscoverySearchTerms = (values: string[]): string[] =>
  [
    ...new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    ),
  ].slice(0, DISCOVERY_SEARCH_TERM_MAX_COUNT);
