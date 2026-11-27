import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { NEXT_BEST_ACTION_DRAFT_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: NEXT_BEST_ACTION_DRAFT_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'nextBestActionDraft',
  type: FieldType.TEXT,
  label: 'Draft follow-up',
  description:
    'A follow-up message drafted by the Deal coach agent in the contact’s language, or talking points for a call or meeting. Never sent automatically.',
  icon: 'IconPencil',
  isNullable: true,
  isUIEditable: false,
});
