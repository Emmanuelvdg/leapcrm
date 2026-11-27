import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  OPPORTUNITY_SUBMISSIONS_RELATION_UNIVERSAL_IDENTIFIER,
  SUBMISSION_OBJECT_UNIVERSAL_IDENTIFIER,
  SUBMISSION_OPPORTUNITY_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: OPPORTUNITY_SUBMISSIONS_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.RELATION,
  name: 'leadFormSubmissions',
  label: 'Form submissions',
  icon: 'IconInbox',
  relationTargetObjectMetadataUniversalIdentifier:
    SUBMISSION_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    SUBMISSION_OPPORTUNITY_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
