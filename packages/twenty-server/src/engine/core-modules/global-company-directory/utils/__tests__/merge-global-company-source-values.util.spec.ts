import { type GlobalCompanyValues } from 'src/engine/core-modules/global-company-directory/types/global-company-values.type';
import { mergeGlobalCompanySourceValues } from 'src/engine/core-modules/global-company-directory/utils/merge-global-company-source-values.util';

const EMPTY_VALUES: GlobalCompanyValues = {
  name: 'Acme',
  normalizedName: null,
  countryCode: null,
  region: null,
  canonicalDomain: null,
  lei: null,
  registrationAuthority: null,
  registrationNumber: null,
  industry: null,
  industryCode: null,
  industryCodeScheme: null,
  employeeCount: null,
  description: null,
};

const buildSource = (
  sourceRank: number,
  retrievedAt: string,
  values: Partial<GlobalCompanyValues>,
) => ({
  sourceRank,
  retrievedAt: new Date(retrievedAt),
  values: { ...EMPTY_VALUES, ...values },
});

describe('mergeGlobalCompanySourceValues', () => {
  it('takes each field from the most precise source that has it', () => {
    const merged = mergeGlobalCompanySourceValues([
      buildSource(20, '2026-10-01', {
        name: 'Acme Asia',
        employeeCount: 120,
        canonicalDomain: 'acme.sg',
      }),
      buildSource(10, '2026-01-01', {
        name: 'ACME PTE. LTD.',
        lei: '254900NM2JQUVESOI109',
      }),
    ]);

    expect(merged.name).toBe('ACME PTE. LTD.');
    expect(merged.lei).toBe('254900NM2JQUVESOI109');
    expect(merged.employeeCount).toBe(120);
    expect(merged.canonicalDomain).toBe('acme.sg');
  });

  it('prefers the newer value between equally precise sources', () => {
    const merged = mergeGlobalCompanySourceValues([
      buildSource(20, '2026-01-01', { employeeCount: 80 }),
      buildSource(20, '2026-09-01', { employeeCount: 140 }),
    ]);

    expect(merged.employeeCount).toBe(140);
  });

  it('never lets a missing value erase a known one', () => {
    const merged = mergeGlobalCompanySourceValues([
      buildSource(5, '2026-10-01', { industry: null }),
      buildSource(20, '2026-01-01', { industry: 'Payments' }),
    ]);

    expect(merged.industry).toBe('Payments');
  });
});
