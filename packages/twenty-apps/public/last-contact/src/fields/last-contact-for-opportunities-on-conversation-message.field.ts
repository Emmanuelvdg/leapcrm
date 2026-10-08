import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  CONVERSATION_MESSAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  LAST_CONTACT_FOR_OPPORTUNITIES_ON_CONVERSATION_MESSAGE_FIELD_UNIVERSAL_IDENTIFIER,
  OPPORTUNITY_LAST_CONTACT_ITEM_CONVERSATION_MESSAGE_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier:
    LAST_CONTACT_FOR_OPPORTUNITIES_ON_CONVERSATION_MESSAGE_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: CONVERSATION_MESSAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'lastContactForOpportunities',
  label: 'Last contact for opportunities',
  description:
    'Opportunities whose most recent contact was this WhatsApp message.',
  icon: 'IconTargetArrow',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    OPPORTUNITY_LAST_CONTACT_ITEM_CONVERSATION_MESSAGE_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
  isUIEditable: false,
});
