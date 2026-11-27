import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  FORM_DEAL_OWNER_RELATION_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_OBJECT_UNIVERSAL_IDENTIFIER,
  WORKSPACE_MEMBER_LEAD_FORMS_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier:
    WORKSPACE_MEMBER_LEAD_FORMS_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  type: FieldType.RELATION,
  name: 'ownedLeadForms',
  label: 'Lead forms owned',
  icon: 'IconForms',
  relationTargetObjectMetadataUniversalIdentifier:
    LEAD_FORM_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    FORM_DEAL_OWNER_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
