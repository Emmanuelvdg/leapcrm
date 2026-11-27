import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';

import {
  LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  LINE_ITEM_PRODUCT_RELATION_UNIVERSAL_IDENTIFIER,
  PRODUCT_LINE_ITEMS_RELATION_UNIVERSAL_IDENTIFIER,
  PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: LINE_ITEM_PRODUCT_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'product',
  label: 'Product',
  icon: 'IconPackage',
  relationTargetObjectMetadataUniversalIdentifier:
    PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    PRODUCT_LINE_ITEMS_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'productId',
  },
});
