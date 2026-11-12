import { FieldMetadataType } from 'twenty-shared/types';

import { buildIcpCandidateAttributeRecord } from 'src/modules/icp-analysis/scoring/utils/build-icp-candidate-attribute-record.util';
import { type IcpCatalogAttribute } from 'src/modules/icp-analysis/types/icp-catalog-attribute.type';
import { extractIcpAttributeValues } from 'src/modules/icp-analysis/utils/extract-icp-attribute-values.util';

const ATTRIBUTES: IcpCatalogAttribute[] = [
  {
    key: 'address.addressCountry',
    label: 'Address country',
    category: 'FIRMOGRAPHIC',
    valueType: 'CATEGORY',
    source: { fieldName: 'address', fieldType: FieldMetadataType.ADDRESS },
  },
  {
    key: 'employees',
    label: 'Employees',
    category: 'FIRMOGRAPHIC',
    valueType: 'NUMBER',
    source: { fieldName: 'employees', fieldType: FieldMetadataType.NUMBER },
  },
  {
    key: 'industry',
    label: 'Industry',
    category: 'FIRMOGRAPHIC',
    valueType: 'CATEGORY',
    source: { fieldName: 'industry', fieldType: FieldMetadataType.SELECT },
  },
];

const extract = (candidate: {
  country: string | null;
  employeeCount: number | null;
}) =>
  extractIcpAttributeValues({
    record: buildIcpCandidateAttributeRecord(candidate),
    attributes: ATTRIBUTES,
    referenceDate: new Date('2026-11-11T00:00:00.000Z'),
  });

describe('buildIcpCandidateAttributeRecord', () => {
  it('maps a country code to the country name company addresses use', () => {
    expect(extract({ country: 'GB', employeeCount: 120 })).toEqual({
      'address.addressCountry': 'United Kingdom',
      employees: 120,
      industry: null,
    });
  });

  it('keeps a country that is already a name', () => {
    expect(
      extract({ country: 'Singapore', employeeCount: null })[
        'address.addressCountry'
      ],
    ).toBe('Singapore');
  });

  it('leaves everything unknown for a candidate without firmographics', () => {
    expect(extract({ country: null, employeeCount: null })).toEqual({
      'address.addressCountry': null,
      employees: null,
      industry: null,
    });
  });
});
