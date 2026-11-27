import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { NEXT_BEST_ACTION_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: NEXT_BEST_ACTION_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'nextBestAction',
  type: FieldType.TEXT,
  label: 'Next best action',
  description:
    'The next step the Deal coach agent suggests for this deal. Empty for closed deals.',
  icon: 'IconBulb',
  isNullable: true,
  isUIEditable: false,
});
