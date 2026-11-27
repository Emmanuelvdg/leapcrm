import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { NEXT_BEST_ACTION_UPDATED_AT_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: NEXT_BEST_ACTION_UPDATED_AT_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'nextBestActionUpdatedAt',
  type: FieldType.DATE_TIME,
  label: 'Next action updated',
  description: 'When the Deal coach agent last looked at this deal.',
  icon: 'IconClockEdit',
  isNullable: true,
  isUIEditable: false,
});
