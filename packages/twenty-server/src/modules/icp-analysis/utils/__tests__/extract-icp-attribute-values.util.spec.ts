import { FieldMetadataType } from 'twenty-shared/types';

import { type IcpCatalogAttribute } from 'src/modules/icp-analysis/types/icp-catalog-attribute.type';
import { extractIcpAttributeValues } from 'src/modules/icp-analysis/utils/extract-icp-attribute-values.util';

const buildAttribute = (
  key: string,
  fieldType: FieldMetadataType,
  fieldName = key,
): IcpCatalogAttribute => ({
  key,
  label: key,
  category: 'FIRMOGRAPHIC',
  valueType: 'CATEGORY',
  source: { fieldName, fieldType },
});

const ATTRIBUTES: IcpCatalogAttribute[] = [
  buildAttribute('industry', FieldMetadataType.SELECT),
  buildAttribute('techStack', FieldMetadataType.MULTI_SELECT),
  buildAttribute('tags', FieldMetadataType.ARRAY),
  buildAttribute('isPublic', FieldMetadataType.BOOLEAN),
  buildAttribute('employees', FieldMetadataType.NUMBER),
  buildAttribute('fit', FieldMetadataType.RATING),
  buildAttribute('annualRevenue', FieldMetadataType.CURRENCY),
  buildAttribute('lastFundingDate', FieldMetadataType.DATE),
  buildAttribute('lastEventAt', FieldMetadataType.DATE_TIME),
  buildAttribute(
    'address.addressCountry',
    FieldMetadataType.ADDRESS,
    'address',
  ),
];

const REFERENCE_DATE = new Date('2026-06-01T12:00:00.000Z');

describe('extractIcpAttributeValues', () => {
  it('reads each field type into a scoring value', () => {
    expect(
      extractIcpAttributeValues({
        record: {
          industry: 'FINTECH',
          techStack: ['SALESFORCE', 'SLACK'],
          tags: ['b2b', '', 'saas'],
          isPublic: false,
          employees: '120',
          fit: 'RATING_4',
          annualRevenue: {
            amountMicros: 2_500_000_000_000,
            currencyCode: 'USD',
          },
          lastFundingDate: '2026-03-03',
          lastEventAt: new Date('2026-06-15T00:00:00.000Z'),
          address: {
            addressCity: 'London',
            addressCountry: ' United Kingdom ',
          },
        },
        attributes: ATTRIBUTES,
        referenceDate: REFERENCE_DATE,
      }),
    ).toEqual({
      industry: 'FINTECH',
      techStack: ['SALESFORCE', 'SLACK'],
      tags: ['b2b', 'saas'],
      isPublic: false,
      employees: 120,
      fit: 4,
      annualRevenue: 2_500_000,
      lastFundingDate: 90,
      lastEventAt: -14,
      'address.addressCountry': 'United Kingdom',
    });
  });

  it('returns null for missing or malformed values', () => {
    expect(
      extractIcpAttributeValues({
        record: {
          industry: 42,
          techStack: 'SALESFORCE',
          employees: 'many',
          fit: 'RATING_X',
          annualRevenue: { amountMicros: null, currencyCode: 'USD' },
          lastFundingDate: 'not a date',
          address: { addressCountry: '' },
        },
        attributes: ATTRIBUTES,
        referenceDate: REFERENCE_DATE,
      }),
    ).toEqual({
      industry: null,
      techStack: null,
      tags: null,
      isPublic: null,
      employees: null,
      fit: null,
      annualRevenue: null,
      lastFundingDate: null,
      lastEventAt: null,
      'address.addressCountry': null,
    });
  });
});
