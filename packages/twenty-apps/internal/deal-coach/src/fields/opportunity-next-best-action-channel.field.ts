import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { CHANNEL_LABELS } from 'src/constants/next-best-action-options';
import {
  CHANNEL_EMAIL_OPTION_ID,
  CHANNEL_WHATSAPP_OPTION_ID,
  NEXT_BEST_ACTION_CHANNEL_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: NEXT_BEST_ACTION_CHANNEL_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'nextBestActionChannel',
  type: FieldType.SELECT,
  label: 'Next action channel',
  description:
    'Where the drafted message should go. Empty when the next step is a call or an internal task.',
  icon: 'IconMessages',
  isNullable: true,
  isUIEditable: false,
  options: [
    {
      id: CHANNEL_WHATSAPP_OPTION_ID,
      value: 'WHATSAPP',
      label: CHANNEL_LABELS.WHATSAPP,
      color: 'green',
      position: 0,
    },
    {
      id: CHANNEL_EMAIL_OPTION_ID,
      value: 'EMAIL',
      label: CHANNEL_LABELS.EMAIL,
      color: 'blue',
      position: 1,
    },
  ],
});
