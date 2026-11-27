import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { ACTION_TYPE_LABELS } from 'src/constants/next-best-action-options';
import {
  ACTION_TYPE_CALL_OPTION_ID,
  ACTION_TYPE_REPLY_OPTION_ID,
  ACTION_TYPE_SCHEDULE_MEETING_OPTION_ID,
  ACTION_TYPE_SEND_QUOTE_OPTION_ID,
  ACTION_TYPE_TASK_OPTION_ID,
  NEXT_BEST_ACTION_TYPE_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: NEXT_BEST_ACTION_TYPE_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'nextBestActionType',
  type: FieldType.SELECT,
  label: 'Next action type',
  description:
    'What kind of step the Deal coach agent suggests: reply, schedule a meeting, send a quote, call or an internal task.',
  icon: 'IconCategory',
  isNullable: true,
  isUIEditable: false,
  options: [
    {
      id: ACTION_TYPE_REPLY_OPTION_ID,
      value: 'REPLY',
      label: ACTION_TYPE_LABELS.REPLY,
      color: 'blue',
      position: 0,
    },
    {
      id: ACTION_TYPE_SCHEDULE_MEETING_OPTION_ID,
      value: 'SCHEDULE_MEETING',
      label: ACTION_TYPE_LABELS.SCHEDULE_MEETING,
      color: 'turquoise',
      position: 1,
    },
    {
      id: ACTION_TYPE_SEND_QUOTE_OPTION_ID,
      value: 'SEND_QUOTE',
      label: ACTION_TYPE_LABELS.SEND_QUOTE,
      color: 'orange',
      position: 2,
    },
    {
      id: ACTION_TYPE_CALL_OPTION_ID,
      value: 'CALL',
      label: ACTION_TYPE_LABELS.CALL,
      color: 'purple',
      position: 3,
    },
    {
      id: ACTION_TYPE_TASK_OPTION_ID,
      value: 'TASK',
      label: ACTION_TYPE_LABELS.TASK,
      color: 'gray',
      position: 4,
    },
  ],
});
