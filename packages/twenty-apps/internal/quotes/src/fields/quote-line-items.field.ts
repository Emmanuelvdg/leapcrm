import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import {
  LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  LINE_ITEM_QUOTE_RELATION_UNIVERSAL_IDENTIFIER,
  QUOTE_LINE_ITEMS_RELATION_UNIVERSAL_IDENTIFIER,
  QUOTE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: QUOTE_LINE_ITEMS_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: QUOTE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'lineItems',
  label: 'Lines',
  icon: 'IconListNumbers',
  relationTargetObjectMetadataUniversalIdentifier:
    LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    LINE_ITEM_QUOTE_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
