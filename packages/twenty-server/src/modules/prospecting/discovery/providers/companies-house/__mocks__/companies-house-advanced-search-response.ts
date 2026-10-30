// Recorded from GET /advanced-search/companies?company_name_includes=payments
// &company_status=active&size=2 on the public data API.
export const mockCompaniesHouseAdvancedSearchResponse = {
  etag: '1243a8b357fb4ffcf26cd19fb5c7e3dd53cf8df1',
  kind: 'search#advanced-search',
  hits: 632,
  items: [
    {
      company_name: 'WILKIE PAYMENTS LTD',
      company_number: 'SC759349',
      company_status: 'active',
      company_type: 'ltd',
      kind: 'search-results#company',
      links: { company_profile: '/company/SC759349' },
      date_of_creation: '2023-02-17',
      registered_office_address: {
        address_line_1: '2 Academy Road',
        locality: 'Crieff',
        postal_code: 'PH7 4AT',
        country: 'Scotland',
      },
      sic_codes: ['62020', '64999'],
    },
    {
      company_name: 'BESPOKE PAYMENTS LTD',
      company_number: '10207832',
      company_status: 'active',
      company_type: 'ltd',
      kind: 'search-results#company',
      links: { company_profile: '/company/10207832' },
      date_of_creation: '2016-05-31',
      registered_office_address: {
        address_line_1: '20-22 Wenlock Road',
        locality: 'London',
        postal_code: 'N1 7GU',
        country: 'England',
      },
      sic_codes: ['62090'],
    },
  ],
};
