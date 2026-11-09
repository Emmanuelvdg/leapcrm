import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { FieldMetadataType } from 'twenty-shared/types';

import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { buildIcpAttributeCatalog } from 'src/modules/icp-analysis/utils/build-icp-attribute-catalog.util';

const buildField = (
  field: Pick<FlatFieldMetadata, 'name' | 'label' | 'type'> &
    Partial<FlatFieldMetadata>,
): FlatFieldMetadata =>
  ({
    universalIdentifier: `${field.name}-universal-identifier`,
    isActive: true,
    isSystem: false,
    options: null,
    ...field,
  }) as FlatFieldMetadata;

describe('buildIcpAttributeCatalog', () => {
  it('turns eligible company fields into attributes', () => {
    const catalog = buildIcpAttributeCatalog([
      buildField({
        name: 'pdlIndustry',
        label: 'Industry',
        type: FieldMetadataType.SELECT,
        options: [
          {
            id: 'a',
            value: 'FINANCIAL_SERVICES',
            label: 'Financial services',
            position: 0,
            color: 'blue',
          },
        ],
      }),
      buildField({
        name: 'address',
        label: 'Address',
        type: FieldMetadataType.ADDRESS,
      }),
      buildField({
        name: 'pdlLastFundingDate',
        label: 'Last funding date',
        type: FieldMetadataType.DATE,
      }),
      buildField({
        name: 'techStack',
        label: 'Tech stack',
        type: FieldMetadataType.MULTI_SELECT,
      }),
      buildField({
        name: 'visitedPricingPage',
        label: 'Visited pricing page',
        type: FieldMetadataType.BOOLEAN,
      }),
      buildField({
        name: 'annualRevenue',
        label: 'Annual revenue',
        type: FieldMetadataType.CURRENCY,
      }),
    ]);

    expect(
      catalog.map(({ key, label, category, valueType }) => ({
        key,
        label,
        category,
        valueType,
      })),
    ).toEqual([
      {
        key: 'address.addressCountry',
        label: 'Address country',
        category: 'FIRMOGRAPHIC',
        valueType: 'CATEGORY',
      },
      {
        key: 'annualRevenue',
        label: 'Annual revenue',
        category: 'FIRMOGRAPHIC',
        valueType: 'NUMBER',
      },
      {
        key: 'pdlIndustry',
        label: 'Industry',
        category: 'FIRMOGRAPHIC',
        valueType: 'CATEGORY',
      },
      {
        key: 'pdlLastFundingDate',
        label: 'Last funding date (days ago)',
        category: 'TRIGGER',
        valueType: 'NUMBER',
      },
      {
        key: 'techStack',
        label: 'Tech stack',
        category: 'TECHNOGRAPHIC',
        valueType: 'CATEGORY_LIST',
      },
      {
        key: 'visitedPricingPage',
        label: 'Visited pricing page',
        category: 'INTENT',
        valueType: 'BOOLEAN',
      },
    ]);

    expect(
      catalog.find(({ key }) => key === 'pdlIndustry')?.valueLabels,
    ).toEqual({ FINANCIAL_SERVICES: 'Financial services' });
  });

  it('leaves out system, inactive, bookkeeping, ICP score and unsupported fields', () => {
    const catalog = buildIcpAttributeCatalog([
      buildField({
        name: 'position',
        label: 'Position',
        type: FieldMetadataType.POSITION,
        isSystem: true,
      }),
      buildField({
        name: 'createdAt',
        label: 'Creation date',
        type: FieldMetadataType.DATE_TIME,
      }),
      buildField({
        name: 'oldTier',
        label: 'Old tier',
        type: FieldMetadataType.SELECT,
        isActive: false,
      }),
      buildField({
        name: 'icpScore',
        label: 'ICP score',
        type: FieldMetadataType.NUMBER,
        universalIdentifier:
          STANDARD_OBJECTS.company.fields.icpScore.universalIdentifier,
      }),
      buildField({
        name: 'tagline',
        label: 'Tagline',
        type: FieldMetadataType.TEXT,
      }),
      buildField({
        name: 'accountOwner',
        label: 'Account owner',
        type: FieldMetadataType.RELATION,
      }),
    ]);

    expect(catalog).toEqual([]);
  });

  it('keeps a custom field that happens to be named like an ICP score field', () => {
    const catalog = buildIcpAttributeCatalog([
      buildField({
        name: 'icpScore',
        label: 'Old ICP score',
        type: FieldMetadataType.NUMBER,
      }),
    ]);

    expect(catalog.map(({ key }) => key)).toEqual(['icpScore']);
  });
});
