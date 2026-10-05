import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { HEALTH_REASONS_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: HEALTH_REASONS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'healthReasons',
  type: FieldType.TEXT,
  label: 'Health reasons',
  description: 'Why this deal got its health status, in plain language.',
  icon: 'IconListDetails',
  isNullable: true,
  isUIEditable: false,
});
