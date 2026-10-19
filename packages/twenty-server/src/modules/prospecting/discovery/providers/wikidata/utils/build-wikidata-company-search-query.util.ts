import { isDefined } from 'twenty-shared/utils';

import { WIKIDATA_ENTITY_SEARCH_RESULT_LIMIT } from 'src/modules/prospecting/discovery/providers/wikidata/constants/wikidata-entity-search-result-limit.constant';
import { escapeSparqlStringLiteral } from 'src/modules/prospecting/discovery/providers/wikidata/utils/escape-sparql-string-literal.util';

const buildIndustrySearchClause = (searchTerm: string) =>
  `{ SERVICE wikibase:mwapi {
        bd:serviceParam wikibase:endpoint "www.wikidata.org" ;
                        wikibase:api "EntitySearch" ;
                        mwapi:search "${escapeSparqlStringLiteral(searchTerm)}" ;
                        mwapi:language "en" ;
                        mwapi:limit "${WIKIDATA_ENTITY_SEARCH_RESULT_LIMIT}" .
        ?industryFilter wikibase:apiOutputItem mwapi:item .
      } }`;

const buildEmployeeCountClause = ({
  employeeCountMin,
  employeeCountMax,
}: {
  employeeCountMin: number | null;
  employeeCountMax: number | null;
}) => {
  const conditions = [
    ...(isDefined(employeeCountMin)
      ? [`?employeeFilter >= ${Math.trunc(employeeCountMin)}`]
      : []),
    ...(isDefined(employeeCountMax)
      ? [`?employeeFilter <= ${Math.trunc(employeeCountMax)}`]
      : []),
  ];

  return conditions.length > 0
    ? `?item wdt:P1128 ?employeeFilter .
      FILTER(${conditions.join(' && ')})`
    : '';
};

// Industry terms are resolved through entity search first and the optimizer
// is disabled so that order is kept: joining on country first times out for
// large countries.
export const buildWikidataCompanySearchQuery = ({
  countryCode,
  searchTerms,
  employeeCountMin,
  employeeCountMax,
  limit,
  offset,
}: {
  countryCode: string | null;
  searchTerms: string[];
  employeeCountMin: number | null;
  employeeCountMax: number | null;
  limit: number;
  offset: number;
}): string => `
SELECT ?item (SAMPLE(?label) AS ?name) (SAMPLE(?description) AS ?itemDescription)
       (SAMPLE(?website) AS ?officialWebsite) (SAMPLE(?lei) AS ?leiCode)
       (MAX(?employees) AS ?employeeCount)
       (GROUP_CONCAT(DISTINCT ?industryLabel; separator="|") AS ?industries)
WHERE {
  {
    SELECT DISTINCT ?item WHERE {
      hint:Query hint:optimizer "None" .
      ${searchTerms.map(buildIndustrySearchClause).join('\n      UNION\n      ')}
      ?item wdt:P452 ?industryFilter .
      ${
        isDefined(countryCode)
          ? `?item wdt:P17 ?country .
      ?country wdt:P297 "${escapeSparqlStringLiteral(countryCode)}" .`
          : ''
      }
      FILTER NOT EXISTS { ?item wdt:P576 ?dissolved . }
      ${buildEmployeeCountClause({ employeeCountMin, employeeCountMax })}
    }
    ORDER BY ?item
    LIMIT ${Math.trunc(limit)}
    OFFSET ${Math.trunc(offset)}
  }
  OPTIONAL { ?item rdfs:label ?label . FILTER(LANG(?label) = "en") }
  OPTIONAL { ?item schema:description ?description . FILTER(LANG(?description) = "en") }
  OPTIONAL { ?item wdt:P856 ?website . }
  OPTIONAL { ?item wdt:P1278 ?lei . }
  OPTIONAL { ?item wdt:P1128 ?employees . }
  OPTIONAL {
    ?item wdt:P452 ?industry .
    ?industry rdfs:label ?industryLabel .
    FILTER(LANG(?industryLabel) = "en")
  }
}
GROUP BY ?item
ORDER BY ?item
`;
