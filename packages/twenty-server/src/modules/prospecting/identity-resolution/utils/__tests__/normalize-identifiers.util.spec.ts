import { normalizeCompanyDomain } from 'src/modules/prospecting/identity-resolution/utils/normalize-company-domain.util';
import { normalizeCountryCode } from 'src/modules/prospecting/identity-resolution/utils/normalize-country-code.util';
import { normalizeLei } from 'src/modules/prospecting/identity-resolution/utils/normalize-lei.util';
import { normalizeRegistrationNumber } from 'src/modules/prospecting/identity-resolution/utils/normalize-registration-number.util';

describe('normalizeLei', () => {
  it.each([
    ['254900NM2JQUVESOI109', '254900NM2JQUVESOI109'],
    [' 5299001o837nu3snkn73 ', '5299001O837NU3SNKN73'],
    ['2549 00LN VD4X JPIE YA56', '254900LNVD4XJPIEYA56'],
  ])('accepts the valid LEI %s', (lei, normalizedLei) => {
    expect(normalizeLei(lei)).toBe(normalizedLei);
  });

  it.each<[string | null, string]>([
    ['254900NM2JQUVESOI108', 'a wrong check digit'],
    ['254900NM2JQUVESOI1', 'a short code'],
    ['254900NM2JQUVESOI1AB', 'letters in the check digits'],
    ['', 'an empty value'],
    [null, 'no value'],
  ])('rejects %s (%s)', (lei) => {
    expect(normalizeLei(lei)).toBeNull();
  });
});

describe('normalizeRegistrationNumber', () => {
  it.each([
    ['RA000523', '201222649R', '201222649R', 'a Singapore company UEN'],
    ['RA000523', ' 53012345d ', '53012345D', 'a Singapore business UEN'],
    ['RA000523', 'T08LL1234A', 'T08LL1234A', 'a Singapore other-entity UEN'],
    ['RA000585', '1234567', '01234567', 'an English number missing its zero'],
    ['RA000585', 'OC 123456', 'OC123456', 'an English LLP number'],
    ['RA000587', 'sc123456', 'SC123456', 'a Scottish number'],
    ['RA000999', 'AB-123/45', 'AB12345', 'a number from an unlisted registry'],
  ])(
    'normalises %s %s to %s (%s)',
    (authority, registrationNumber, normalizedNumber) => {
      expect(
        normalizeRegistrationNumber({ authority, registrationNumber }),
      ).toEqual({ authority, number: normalizedNumber });
    },
  );

  it.each<[string | null, string | null, string]>([
    ['RA000523', '12345', 'a number that is not a UEN'],
    ['RA000587', '01234567', 'a number without the Scottish prefix'],
    [null, '201222649R', 'a number without a registry'],
    ['RA000523', null, 'a registry without a number'],
  ])('drops %s %s (%s)', (authority, registrationNumber) => {
    expect(
      normalizeRegistrationNumber({ authority, registrationNumber }),
    ).toBeNull();
  });
});

describe('normalizeCompanyDomain', () => {
  it.each([
    ['https://www.ocbc.com/', 'ocbc.com'],
    ['http://Shop.Example.COM:8080/about?x=1', 'shop.example.com'],
    ['acme.com.sg', 'acme.com.sg'],
    ['www.acme.com.', 'acme.com'],
    ['https://münchen.de', 'xn--mnchen-3ya.de'],
  ])('normalises %s to %s', (website, domain) => {
    expect(normalizeCompanyDomain(website)).toBe(domain);
  });

  it.each<[string | null, string]>([
    ['https://www.linkedin.com/company/acme', 'a shared social platform'],
    ['https://192.168.0.1', 'an IP address'],
    ['localhost', 'a host without a dot'],
    ['not a website', 'text that is not a domain'],
    [null, 'no value'],
  ])('rejects %s (%s)', (website) => {
    expect(normalizeCompanyDomain(website)).toBeNull();
  });
});

describe('normalizeCountryCode', () => {
  it.each([
    ['sg', 'SG'],
    ['Singapore', 'SG'],
    ['united kingdom', 'GB'],
    ['Narnia', null],
    ['', null],
  ])('reads %s as %s', (value, countryCode) => {
    expect(normalizeCountryCode(value)).toBe(countryCode);
  });
});
