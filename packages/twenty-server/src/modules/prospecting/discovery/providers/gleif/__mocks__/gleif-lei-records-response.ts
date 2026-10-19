// Raw payload recorded from the live API (CC0 data), trimmed to the fields
// the provider reads.
export const mockGleifLeiRecordsResponse = {
  meta: {
    pagination: {
      currentPage: 1,
      perPage: 3,
      from: 1,
      to: 3,
      total: 13,
      lastPage: 5,
    },
  },
  data: [
    {
      type: 'lei-records',
      id: '254900NM2JQUVESOI109',
      attributes: {
        lei: '254900NM2JQUVESOI109',
        entity: {
          legalName: {
            name: 'HEADSTAND PTE. LTD.',
            language: 'en',
          },
          legalAddress: {
            city: 'SINGAPORE',
            region: null,
            country: 'SG',
          },
          registeredAt: {
            id: 'RA000523',
            other: null,
          },
          registeredAs: '201222649R',
          jurisdiction: 'SG',
          category: 'GENERAL',
          status: 'ACTIVE',
        },
      },
    },
    {
      type: 'lei-records',
      id: '254900LNVD4XJPIEYA56',
      attributes: {
        lei: '254900LNVD4XJPIEYA56',
        entity: {
          legalName: {
            name: 'XENDIT PAYMENTS SINGAPORE PTE. LTD.',
            language: 'en',
          },
          legalAddress: {
            city: 'SINGAPORE',
            region: null,
            country: 'SG',
          },
          registeredAt: {
            id: 'RA000523',
            other: null,
          },
          registeredAs: '201715598D',
          jurisdiction: 'SG',
          category: 'GENERAL',
          status: 'ACTIVE',
        },
      },
    },
    {
      type: 'lei-records',
      id: '9845001B5E604808D618',
      attributes: {
        lei: '9845001B5E604808D618',
        entity: {
          legalName: {
            name: 'INTERNATIONAL PAYMENTS IDENTITY (IPID) PTE. LTD.',
            language: 'en',
          },
          legalAddress: {
            city: 'Singapore',
            region: 'SG-01',
            country: 'SG',
          },
          registeredAt: {
            id: 'RA000523',
            other: null,
          },
          registeredAs: '202121027G',
          jurisdiction: 'SG',
          category: 'GENERAL',
          status: 'ACTIVE',
        },
      },
    },
  ],
};
