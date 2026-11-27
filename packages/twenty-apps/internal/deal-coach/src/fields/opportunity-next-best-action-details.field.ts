import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { NEXT_BEST_ACTION_DETAILS_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: NEXT_BEST_ACTION_DETAILS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'nextBestActionDetails',
  type: FieldType.RAW_JSON,
  label: 'Next action details',
  description:
    'What the Next step tab needs to carry out the suggestion: the email subject, the proposed meeting and any suggested change to the deal.',
  icon: 'IconBraces',
  isNullable: true,
  isUIEditable: false,
});
