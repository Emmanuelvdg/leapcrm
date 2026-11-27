import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';

import {
  FORM_SUBMISSIONS_RELATION_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_OBJECT_UNIVERSAL_IDENTIFIER,
  SUBMISSION_FORM_RELATION_UNIVERSAL_IDENTIFIER,
  SUBMISSION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: SUBMISSION_FORM_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: SUBMISSION_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'form',
  label: 'Form',
  icon: 'IconForms',
  relationTargetObjectMetadataUniversalIdentifier:
    LEAD_FORM_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    FORM_SUBMISSIONS_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'formId',
  },
});
