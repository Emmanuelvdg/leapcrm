import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  COMPANY_LAST_CONTACT_ITEM_CONVERSATION_MESSAGE_FIELD_UNIVERSAL_IDENTIFIER,
  COMPANY_LAST_CONTACT_ITEM_MORPH_ID,
  CONVERSATION_MESSAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  LAST_CONTACT_FOR_COMPANIES_ON_CONVERSATION_MESSAGE_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier:
    COMPANY_LAST_CONTACT_ITEM_CONVERSATION_MESSAGE_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.MORPH_RELATION,
  name: 'lastContactItemConversationMessage',
  label: 'Last contact item',
  description:
    'The email, meeting or WhatsApp message that was the most recent contact with a person from this company.',
  icon: 'IconBrandWhatsapp',
  isNullable: true,
  morphId: COMPANY_LAST_CONTACT_ITEM_MORPH_ID,
  relationTargetObjectMetadataUniversalIdentifier:
    CONVERSATION_MESSAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    LAST_CONTACT_FOR_COMPANIES_ON_CONVERSATION_MESSAGE_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'lastContactItemConversationMessageId',
  },
  isUIEditable: false,
});
