import { prospectingIcpSchema } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

describe('prospectingIcpSchema', () => {
  it('accepts a country-only ICP and fills the optional lists', () => {
    const result = prospectingIcpSchema.safeParse({
      targetGeographies: [{ countryCode: 'SG' }],
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      targetGeographies: [{ countryCode: 'SG', regions: [] }],
      targetIndustries: [],
      industryCodes: [],
      employeeCountMin: null,
      employeeCountMax: null,
      keywords: [],
      excludedCountryCodes: [],
      excludedDomains: [],
    });
  });

  it('normalises country codes and excluded domains', () => {
    const result = prospectingIcpSchema.safeParse({
      targetGeographies: [{ countryCode: ' gb ' }],
      excludedCountryCodes: ['fr'],
      excludedDomains: ['Example.COM'],
    });

    expect(result.data?.targetGeographies[0].countryCode).toBe('GB');
    expect(result.data?.excludedCountryCodes).toEqual(['FR']);
    expect(result.data?.excludedDomains).toEqual(['example.com']);
  });

  it('accepts industry codes from a supported scheme', () => {
    const result = prospectingIcpSchema.safeParse({
      industryCodes: [{ scheme: 'SSIC', code: '62011' }],
    });

    expect(result.success).toBe(true);
  });

  it('rejects an unknown country code', () => {
    const result = prospectingIcpSchema.safeParse({
      targetGeographies: [{ countryCode: 'XX' }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([
      'targetGeographies',
      0,
      'countryCode',
    ]);
  });

  it('rejects an ICP without any targeting criterion', () => {
    const result = prospectingIcpSchema.safeParse({ employeeCountMin: 10 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain(
      'add at least one target country',
    );
  });

  it('rejects a minimum employee count above the maximum', () => {
    const result = prospectingIcpSchema.safeParse({
      keywords: ['payments'],
      employeeCountMin: 200,
      employeeCountMax: 50,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['employeeCountMax']);
  });

  it('rejects unknown keys so typos are not silently ignored', () => {
    const result = prospectingIcpSchema.safeParse({
      keywords: ['payments'],
      targetCountries: ['SG'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a missing ICP with a readable message', () => {
    const result = prospectingIcpSchema.safeParse(null);

    expect(result.error?.issues[0].message).toBe(
      'Add an ideal customer profile to the campaign',
    );
  });
});
