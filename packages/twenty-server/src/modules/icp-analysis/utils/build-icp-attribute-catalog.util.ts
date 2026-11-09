import {
  type IcpAttributeCategory,
  type IcpAttributeValueType,
} from 'twenty-shared/icp-analysis';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { ICP_SCORE_FIELD_UNIVERSAL_IDENTIFIERS } from 'src/modules/icp-analysis/constants/icp-score-field-universal-identifiers.constant';
import { type IcpCatalogAttribute } from 'src/modules/icp-analysis/types/icp-catalog-attribute.type';

const VALUE_TYPE_BY_FIELD_TYPE: Partial<
  Record<FieldMetadataType, IcpAttributeValueType>
> = {
  [FieldMetadataType.SELECT]: 'CATEGORY',
  [FieldMetadataType.ADDRESS]: 'CATEGORY',
  [FieldMetadataType.MULTI_SELECT]: 'CATEGORY_LIST',
  [FieldMetadataType.ARRAY]: 'CATEGORY_LIST',
  [FieldMetadataType.BOOLEAN]: 'BOOLEAN',
  [FieldMetadataType.NUMBER]: 'NUMBER',
  [FieldMetadataType.CURRENCY]: 'NUMBER',
  [FieldMetadataType.RATING]: 'NUMBER',
  [FieldMetadataType.DATE]: 'NUMBER',
  [FieldMetadataType.DATE_TIME]: 'NUMBER',
};

const DATE_FIELD_TYPES: FieldMetadataType[] = [
  FieldMetadataType.DATE,
  FieldMetadataType.DATE_TIME,
];

// Record bookkeeping dates say when someone typed the company in, not
// anything about the company, and would leak the deal timeline.
const EXCLUDED_FIELD_NAMES = new Set([
  'createdAt',
  'updatedAt',
  'deletedAt',
  'position',
]);

const TECHNOGRAPHIC_NAME_PATTERN = /tech|stack|tool|integration|platform/i;
const INTENT_NAME_PATTERN =
  /intent|visit|pricing|demo|trial|engag|download|webinar/i;

// A starting guess from the field name and type; the criteria editor lets the
// user move a criterion to another category.
const guessCategory = (field: FlatFieldMetadata): IcpAttributeCategory => {
  const searchableName = `${field.name} ${field.label}`;

  if (TECHNOGRAPHIC_NAME_PATTERN.test(searchableName)) {
    return 'TECHNOGRAPHIC';
  }

  if (INTENT_NAME_PATTERN.test(searchableName)) {
    return 'INTENT';
  }

  if (DATE_FIELD_TYPES.includes(field.type)) {
    return 'TRIGGER';
  }

  return 'FIRMOGRAPHIC';
};

const buildValueLabels = (
  field: FlatFieldMetadata,
): Record<string, string> | undefined => {
  if (field.type === FieldMetadataType.BOOLEAN) {
    return { true: 'Yes', false: 'No' };
  }

  if (
    field.type !== FieldMetadataType.SELECT &&
    field.type !== FieldMetadataType.MULTI_SELECT
  ) {
    return undefined;
  }

  return Object.fromEntries(
    (field.options ?? []).map((option) => [option.value, option.label]),
  );
};

const buildLabel = (field: FlatFieldMetadata): string => {
  if (field.type === FieldMetadataType.ADDRESS) {
    return `${field.label} country`;
  }

  if (DATE_FIELD_TYPES.includes(field.type)) {
    return `${field.label} (days ago)`;
  }

  return field.label;
};

const isEligibleField = (field: FlatFieldMetadata): boolean =>
  field.isActive &&
  !field.isSystem &&
  !EXCLUDED_FIELD_NAMES.has(field.name) &&
  !ICP_SCORE_FIELD_UNIVERSAL_IDENTIFIERS.has(field.universalIdentifier) &&
  isDefined(VALUE_TYPE_BY_FIELD_TYPE[field.type]);

export const buildIcpAttributeCatalog = (
  companyFields: FlatFieldMetadata[],
): IcpCatalogAttribute[] =>
  companyFields
    .filter(isEligibleField)
    .map((field): IcpCatalogAttribute => {
      const valueLabels = buildValueLabels(field);

      return {
        key:
          field.type === FieldMetadataType.ADDRESS
            ? `${field.name}.addressCountry`
            : field.name,
        label: buildLabel(field),
        category: guessCategory(field),
        valueType: VALUE_TYPE_BY_FIELD_TYPE[field.type] ?? 'CATEGORY',
        ...(isDefined(valueLabels) ? { valueLabels } : {}),
        source: { fieldName: field.name, fieldType: field.type },
      };
    })
    .sort((first, second) => first.label.localeCompare(second.label));
