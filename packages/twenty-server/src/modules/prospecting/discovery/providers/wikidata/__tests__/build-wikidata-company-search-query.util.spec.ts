import { buildWikidataCompanySearchQuery } from 'src/modules/prospecting/discovery/providers/wikidata/utils/build-wikidata-company-search-query.util';
import { escapeSparqlStringLiteral } from 'src/modules/prospecting/discovery/providers/wikidata/utils/escape-sparql-string-literal.util';

const BASE_PARAMETERS = {
  countryCode: 'GB',
  searchTerms: ['software'],
  employeeCountMin: null,
  employeeCountMax: null,
  limit: 50,
  offset: 100,
};

describe('escapeSparqlStringLiteral', () => {
  it('escapes characters that could end the literal', () => {
    expect(escapeSparqlStringLiteral('a "quoted" \\ term\nnext')).toBe(
      'a \\"quoted\\" \\\\ term\\nnext',
    );
  });

  it('drops other control characters', () => {
    expect(escapeSparqlStringLiteral('fin\u0000tech\u0007')).toBe('fintech');
  });
});

describe('buildWikidataCompanySearchQuery', () => {
  it('keeps a term that tries to break out of the literal inside it', () => {
    const query = buildWikidataCompanySearchQuery({
      ...BASE_PARAMETERS,
      searchTerms: ['fintech" } DELETE WHERE { ?s ?p ?o } #'],
    });

    expect(query).toContain(
      'mwapi:search "fintech\\" } DELETE WHERE { ?s ?p ?o } #"',
    );
  });

  it('searches each term in its own block', () => {
    const query = buildWikidataCompanySearchQuery({
      ...BASE_PARAMETERS,
      searchTerms: ['software', 'payments'],
    });

    expect(query.match(/SERVICE wikibase:mwapi/g)).toHaveLength(2);
    expect(query).toContain('UNION');
  });

  it('filters by country, size and page when given', () => {
    const query = buildWikidataCompanySearchQuery({
      ...BASE_PARAMETERS,
      employeeCountMin: 10,
      employeeCountMax: 250,
    });

    expect(query).toContain('?country wdt:P297 "GB"');
    expect(query).toContain('?employeeFilter >= 10 && ?employeeFilter <= 250');
    expect(query).toContain('LIMIT 50');
    expect(query).toContain('OFFSET 100');
  });

  it('omits the country and size filters when not given', () => {
    const query = buildWikidataCompanySearchQuery({
      ...BASE_PARAMETERS,
      countryCode: null,
    });

    expect(query).not.toContain('wdt:P297');
    expect(query).not.toContain('?employeeFilter');
  });
});
