import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import {
  FORM_SUBMISSIONS_RELATION_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_OBJECT_UNIVERSAL_IDENTIFIER,
  SUBMISSION_FORM_RELATION_UNIVERSAL_IDENTIFIER,
  SUBMISSION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: FORM_SUBMISSIONS_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: LEAD_FORM_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'submissions',
  label: 'Submissions',
  icon: 'IconInbox',
  relationTargetObjectMetadataUniversalIdentifier:
    SUBMISSION_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    SUBMISSION_FORM_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
