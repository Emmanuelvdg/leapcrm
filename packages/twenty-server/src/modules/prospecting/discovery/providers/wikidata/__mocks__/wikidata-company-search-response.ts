// Raw payload recorded from the live API (CC0 data), trimmed to the fields
// the provider reads.
export const mockWikidataCompanySearchResponse = {
  head: {
    vars: [
      'item',
      'name',
      'itemDescription',
      'officialWebsite',
      'leiCode',
      'employeeCount',
      'industries',
    ],
  },
  results: {
    bindings: [
      {
        item: {
          type: 'uri',
          value: 'http://www.wikidata.org/entity/Q2042423',
        },
        name: {
          'xml:lang': 'en',
          type: 'literal',
          value: 'Oversea-Chinese Banking Corporation',
        },
        itemDescription: {
          'xml:lang': 'en',
          type: 'literal',
          value: 'Singapore company',
        },
        officialWebsite: {
          type: 'uri',
          value: 'https://www.ocbc.com/',
        },
        employeeCount: {
          datatype: 'http://www.w3.org/2001/XMLSchema#decimal',
          type: 'literal',
          value: '29174',
        },
        industries: {
          type: 'literal',
          value: 'financial services|financial sector',
        },
      },
      {
        item: {
          type: 'uri',
          value: 'http://www.wikidata.org/entity/Q637440',
        },
        name: {
          'xml:lang': 'en',
          type: 'literal',
          value: 'Lazard',
        },
        itemDescription: {
          'xml:lang': 'en',
          type: 'literal',
          value: 'Global Financial advisory and asset management firm',
        },
        officialWebsite: {
          type: 'uri',
          value: 'https://lazard.com/',
        },
        employeeCount: {
          datatype: 'http://www.w3.org/2001/XMLSchema#decimal',
          type: 'literal',
          value: '3291',
        },
        industries: {
          type: 'literal',
          value:
            'asset management|investment banking|financial service activities, except insurance and pension funding|financial sector',
        },
        leiCode: {
          type: 'literal',
          value: '5493009YO1MGVNTJ0W35',
        },
      },
      {
        item: {
          type: 'uri',
          value: 'http://www.wikidata.org/entity/Q705417',
        },
        name: {
          'xml:lang': 'en',
          type: 'literal',
          value: 'DBS Bank',
        },
        itemDescription: {
          'xml:lang': 'en',
          type: 'literal',
          value:
            'multinational banking and financial services company based in Singapore',
        },
        officialWebsite: {
          type: 'uri',
          value: 'https://www.dbs.com.sg/',
        },
        employeeCount: {
          datatype: 'http://www.w3.org/2001/XMLSchema#decimal',
          type: 'literal',
          value: '24174',
        },
        industries: {
          type: 'literal',
          value: 'financial sector',
        },
      },
    ],
  },
};
