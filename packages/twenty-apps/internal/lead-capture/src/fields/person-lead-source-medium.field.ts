import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { PERSON_LEAD_SOURCE_MEDIUM_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_LEAD_SOURCE_MEDIUM_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  name: 'leadSourceMedium',
  type: FieldType.TEXT,
  label: 'Lead source medium',
  description: 'utm_medium when this contact first came in, e.g. cpc or email.',
  icon: 'IconAntenna',
  isNullable: true,
});
