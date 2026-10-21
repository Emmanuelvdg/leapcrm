import { buildProspectCompanyImportRow } from '@/prospecting/utils/buildProspectCompanyImportRow';

describe('buildProspectCompanyImportRow', () => {
  it('keeps filled columns and drops empty ones', () => {
    expect(
      buildProspectCompanyImportRow({
        name: ' Acme Pte Ltd ',
        domain: 'acme.sg',
        country: 'Singapore',
        registrationNumber: '',
        employeeCount: '120',
      }),
    ).toEqual({
      name: 'Acme Pte Ltd',
      domain: 'acme.sg',
      country: 'Singapore',
      registrationNumber: undefined,
      registrationAuthority: undefined,
      lei: undefined,
      industry: undefined,
      employeeCount: 120,
    });
  });

  it('skips rows without a company name', () => {
    expect(
      buildProspectCompanyImportRow({ name: '  ', domain: 'acme.sg' }),
    ).toBeNull();
  });

  it('ignores an employee count that is not a number', () => {
    expect(
      buildProspectCompanyImportRow({ name: 'Acme', employeeCount: 'many' })
        ?.employeeCount,
    ).toBeUndefined();
  });
});
