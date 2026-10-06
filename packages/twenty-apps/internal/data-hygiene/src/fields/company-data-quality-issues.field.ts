import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { COMPANY_DATA_QUALITY_ISSUES_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: COMPANY_DATA_QUALITY_ISSUES_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  name: 'dataQualityIssues',
  type: FieldType.TEXT,
  label: 'Data quality issues',
  description: 'What needs cleaning up on this company.',
  icon: 'IconListCheck',
  isNullable: true,
  isUIEditable: false,
});
