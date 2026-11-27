import { defineObject, FieldType, NumberDataType } from 'twenty-sdk/define';

import {
  LINE_ITEM_DISCOUNT_FIELD_UNIVERSAL_IDENTIFIER,
  LINE_ITEM_HSN_SAC_FIELD_UNIVERSAL_IDENTIFIER,
  LINE_ITEM_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  LINE_ITEM_QUANTITY_FIELD_UNIVERSAL_IDENTIFIER,
  LINE_ITEM_SORT_ORDER_FIELD_UNIVERSAL_IDENTIFIER,
  LINE_ITEM_TAX_RATE_FIELD_UNIVERSAL_IDENTIFIER,
  LINE_ITEM_TOTAL_FIELD_UNIVERSAL_IDENTIFIER,
  LINE_ITEM_UNIT_FIELD_UNIVERSAL_IDENTIFIER,
  LINE_ITEM_UNIT_PRICE_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

const percent = (
  universalIdentifier: string,
  name: string,
  label: string,
  icon: string,
) => ({
  universalIdentifier,
  type: FieldType.NUMBER as const,
  name,
  label,
  icon,
  isNullable: true as const,
  universalSettings: {
    dataType: NumberDataType.FLOAT,
    decimals: 2,
    type: 'number' as const,
  },
});

export default defineObject({
  universalIdentifier: LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'quoteLineItem',
  namePlural: 'quoteLineItems',
  labelSingular: 'Quote line',
  labelPlural: 'Quote lines',
  description: 'One product or service on a quote.',
  icon: 'IconListNumbers',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LINE_ITEM_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: LINE_ITEM_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Description',
      icon: 'IconAbc',
    },
    {
      ...percent(
        LINE_ITEM_QUANTITY_FIELD_UNIVERSAL_IDENTIFIER,
        'quantity',
        'Quantity',
        'IconNumber',
      ),
      defaultValue: 1,
    },
    {
      universalIdentifier: LINE_ITEM_UNIT_PRICE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.CURRENCY,
      name: 'unitPrice',
      label: 'Rate',
      description: 'Price per unit, before discount and tax.',
      icon: 'IconCurrencyRupee',
      isNullable: true,
    },
    percent(
      LINE_ITEM_DISCOUNT_FIELD_UNIVERSAL_IDENTIFIER,
      'discountPercent',
      'Discount (%)',
      'IconDiscount',
    ),
    percent(
      LINE_ITEM_TAX_RATE_FIELD_UNIVERSAL_IDENTIFIER,
      'taxRate',
      'Tax rate (%)',
      'IconReceiptTax',
    ),
    {
      universalIdentifier: LINE_ITEM_TOTAL_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.CURRENCY,
      name: 'lineTotal',
      label: 'Amount',
      description: 'Quantity times rate, less discount, before tax.',
      icon: 'IconCalculator',
      isNullable: true,
      isUIEditable: false,
    },
    {
      universalIdentifier: LINE_ITEM_UNIT_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'unit',
      label: 'Unit',
      icon: 'IconRuler',
      isNullable: true,
    },
    {
      universalIdentifier: LINE_ITEM_HSN_SAC_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'hsnSacCode',
      label: 'HSN/SAC code',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: LINE_ITEM_SORT_ORDER_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'sortOrder',
      label: 'Line number',
      icon: 'IconSortAscendingNumbers',
      isNullable: true,
      universalSettings: {
        dataType: NumberDataType.INT,
        decimals: 0,
        type: 'number',
      },
    },
  ],
});
