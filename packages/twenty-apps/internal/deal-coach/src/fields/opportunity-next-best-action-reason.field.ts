import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { NEXT_BEST_ACTION_REASON_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: NEXT_BEST_ACTION_REASON_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'nextBestActionReason',
  type: FieldType.TEXT,
  label: 'Next action reason',
  description:
    'Why the Deal coach agent suggests this step, citing what it read on the deal.',
  icon: 'IconMessageQuestion',
  isNullable: true,
  isUIEditable: false,
});
