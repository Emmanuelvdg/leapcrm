import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';

import {
  LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  LINE_ITEM_QUOTE_RELATION_UNIVERSAL_IDENTIFIER,
  QUOTE_LINE_ITEMS_RELATION_UNIVERSAL_IDENTIFIER,
  QUOTE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: LINE_ITEM_QUOTE_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'quote',
  label: 'Quote',
  icon: 'IconFileInvoice',
  relationTargetObjectMetadataUniversalIdentifier:
    QUOTE_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    QUOTE_LINE_ITEMS_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'quoteId',
  },
});
