import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { STAGE_CHANGED_AT_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: STAGE_CHANGED_AT_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'stageChangedAt',
  type: FieldType.DATE_TIME,
  label: 'Stage changed',
  description: 'When this deal last moved to a different stage.',
  icon: 'IconProgressCheck',
  isNullable: true,
  isUIEditable: false,
});
