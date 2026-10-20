import { normalizeCompanyName } from 'src/modules/prospecting/identity-resolution/utils/normalize-company-name.util';

describe('normalizeCompanyName', () => {
  it.each([
    ['SG', 'Xendit Payments Singapore Pte. Ltd.', 'XENDIT PAYMENTS SINGAPORE'],
    [
      'SG',
      'XENDIT PAYMENTS SINGAPORE PRIVATE LIMITED',
      'XENDIT PAYMENTS SINGAPORE',
    ],
    ['SG', 'Acme Pte Ltd', 'ACME'],
    ['GB', 'Acme Holdings PLC', 'ACME HOLDINGS'],
    ['GB', 'Acme Ltd', 'ACME'],
    ['GB', 'Acme Public Limited Company', 'ACME'],
    ['AU', 'Acme Pty. Ltd.', 'ACME'],
    ['AU', 'Acme Proprietary Limited', 'ACME'],
    ['FR', 'Société Générale SA', 'SOCIETE GENERALE'],
    ['FR', 'Acme SARL', 'ACME'],
    ['DE', 'Müller GmbH & Co. KG', 'MULLER'],
    ['DE', 'Acme AG', 'ACME'],
    ['US', 'Acme, Inc.', 'ACME'],
    ['US', 'Acme Corporation', 'ACME'],
    ['MY', 'Acme Sdn. Bhd.', 'ACME'],
    ['HK', 'Acme Co., Ltd.', 'ACME'],
    ['ID', 'PT Bank Acme Tbk', 'BANK ACME'],
    ['JP', 'Acme Kabushiki Kaisha', 'ACME'],
  ])(
    'strips the %s legal form from %s',
    (countryCode, name, normalizedName) => {
      expect(normalizeCompanyName({ name, countryCode })).toBe(normalizedName);
    },
  );

  it('removes a leading "The" and joins "&" as AND', () => {
    expect(
      normalizeCompanyName({ name: 'The Smith & Sons Ltd', countryCode: 'GB' }),
    ).toBe('SMITH AND SONS');
  });

  it('only strips the generic forms when the country is unknown', () => {
    expect(normalizeCompanyName({ name: 'Acme SARL', countryCode: null })).toBe(
      'ACME SARL',
    );
    expect(normalizeCompanyName({ name: 'Acme Ltd', countryCode: null })).toBe(
      'ACME',
    );
  });

  it('keeps names whose words merely contain a legal form', () => {
    expect(
      normalizeCompanyName({ name: 'Incorporate Labs', countryCode: 'US' }),
    ).toBe('INCORPORATE LABS');
  });

  it('keeps a name made only of a legal form', () => {
    expect(normalizeCompanyName({ name: 'Limited', countryCode: 'GB' })).toBe(
      'LIMITED',
    );
  });

  it('keeps non-Latin names', () => {
    expect(
      normalizeCompanyName({ name: '华为技术有限公司', countryCode: 'CN' }),
    ).toBe('华为技术有限公司');
  });
});
