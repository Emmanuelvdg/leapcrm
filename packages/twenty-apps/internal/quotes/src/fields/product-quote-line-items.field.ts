import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import {
  LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  LINE_ITEM_PRODUCT_RELATION_UNIVERSAL_IDENTIFIER,
  PRODUCT_LINE_ITEMS_RELATION_UNIVERSAL_IDENTIFIER,
  PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PRODUCT_LINE_ITEMS_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'quoteLineItems',
  label: 'Quote lines',
  icon: 'IconListNumbers',
  relationTargetObjectMetadataUniversalIdentifier:
    LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    LINE_ITEM_PRODUCT_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
