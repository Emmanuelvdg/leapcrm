import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { PERSON_DATA_QUALITY_ISSUES_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_DATA_QUALITY_ISSUES_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  name: 'dataQualityIssues',
  type: FieldType.TEXT,
  label: 'Data quality issues',
  description: 'What needs cleaning up on this person.',
  icon: 'IconListCheck',
  isNullable: true,
  isUIEditable: false,
});
