import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  QUOTE_APPROVED_BY_RELATION_UNIVERSAL_IDENTIFIER,
  QUOTE_OBJECT_UNIVERSAL_IDENTIFIER,
  WORKSPACE_MEMBER_APPROVED_QUOTES_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier:
    WORKSPACE_MEMBER_APPROVED_QUOTES_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  type: FieldType.RELATION,
  name: 'approvedQuotes',
  label: 'Quotes approved',
  icon: 'IconFileInvoice',
  relationTargetObjectMetadataUniversalIdentifier:
    QUOTE_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    QUOTE_APPROVED_BY_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
