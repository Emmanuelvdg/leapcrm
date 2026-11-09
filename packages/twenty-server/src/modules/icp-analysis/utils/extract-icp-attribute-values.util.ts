import {
  type IcpAttributeValue,
  type IcpAttributeValues,
} from 'twenty-shared/icp-analysis';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type IcpCatalogAttribute } from 'src/modules/icp-analysis/types/icp-catalog-attribute.type';

const DAY_IN_MILLISECONDS = 86_400_000;
const RATING_VALUE_PATTERN = /^RATING_(\d+)$/;

const toFiniteNumber = (value: unknown): number | null => {
  const numberValue =
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

  return typeof numberValue === 'number' && Number.isFinite(numberValue)
    ? numberValue
    : null;
};

const toStringList = (value: unknown): string[] | null =>
  Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === 'string' && item !== '',
      )
    : null;

const getObjectProperty = (value: unknown, propertyName: string): unknown =>
  typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)[propertyName]
    : undefined;

// Whole days, negative when the date falls after the reference date.
const toDaysBefore = (value: unknown, referenceDate: Date): number | null => {
  if (!(value instanceof Date) && typeof value !== 'string') {
    return null;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time)
    ? null
    : Math.floor((referenceDate.getTime() - time) / DAY_IN_MILLISECONDS);
};

const extractValue = ({
  rawValue,
  fieldType,
  referenceDate,
}: {
  rawValue: unknown;
  fieldType: FieldMetadataType;
  referenceDate: Date;
}): IcpAttributeValue => {
  if (!isDefined(rawValue)) {
    return null;
  }

  switch (fieldType) {
    case FieldMetadataType.SELECT:
      return typeof rawValue === 'string' ? rawValue : null;
    case FieldMetadataType.MULTI_SELECT:
    case FieldMetadataType.ARRAY:
      return toStringList(rawValue);
    case FieldMetadataType.BOOLEAN:
      return typeof rawValue === 'boolean' ? rawValue : null;
    case FieldMetadataType.NUMBER:
      return toFiniteNumber(rawValue);
    case FieldMetadataType.RATING: {
      const ratingMatch =
        typeof rawValue === 'string'
          ? RATING_VALUE_PATTERN.exec(rawValue)
          : null;

      return isDefined(ratingMatch) ? Number(ratingMatch[1]) : null;
    }
    case FieldMetadataType.CURRENCY: {
      const amountMicros = toFiniteNumber(
        getObjectProperty(rawValue, 'amountMicros'),
      );

      return isDefined(amountMicros) ? amountMicros / 1_000_000 : null;
    }
    case FieldMetadataType.DATE:
    case FieldMetadataType.DATE_TIME:
      return toDaysBefore(rawValue, referenceDate);
    case FieldMetadataType.ADDRESS: {
      const country = getObjectProperty(rawValue, 'addressCountry');

      return typeof country === 'string' && country.trim() !== ''
        ? country.trim()
        : null;
    }
    default:
      return null;
  }
};

export const extractIcpAttributeValues = ({
  record,
  attributes,
  referenceDate,
}: {
  record: Record<string, unknown>;
  attributes: IcpCatalogAttribute[];
  referenceDate: Date;
}): IcpAttributeValues =>
  Object.fromEntries(
    attributes.map((attribute) => [
      attribute.key,
      extractValue({
        rawValue: record[attribute.source.fieldName],
        fieldType: attribute.source.fieldType,
        referenceDate,
      }),
    ]),
  );
