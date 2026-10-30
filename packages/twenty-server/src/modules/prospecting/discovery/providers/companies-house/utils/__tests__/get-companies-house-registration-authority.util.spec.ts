import { getCompaniesHouseRegistrationAuthority } from 'src/modules/prospecting/discovery/providers/companies-house/utils/get-companies-house-registration-authority.util';

describe('getCompaniesHouseRegistrationAuthority', () => {
  it.each<[string, string, string]>([
    ['10207832', 'RA000585', 'an English company'],
    ['OC123456', 'RA000585', 'an English LLP'],
    ['SC759349', 'RA000587', 'a Scottish company'],
    ['so301234', 'RA000587', 'a Scottish LLP in lower case'],
    ['NI612345', 'RA000586', 'a Northern Irish company'],
    ['R0001234', 'RA000586', 'an old Northern Irish number'],
  ])('maps %s to %s (%s)', (companyNumber, registrationAuthority) => {
    expect(getCompaniesHouseRegistrationAuthority(companyNumber)).toBe(
      registrationAuthority,
    );
  });
});
