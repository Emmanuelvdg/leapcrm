import { defineAgent } from 'twenty-sdk/define';

import { DEAL_COACH_PROMPT } from 'src/constants/deal-coach-prompt';
import { DEAL_COACH_AGENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

const stringProperty = (description: string) => ({
  type: 'string' as const,
  description,
});

const numberProperty = (description: string) => ({
  type: 'number' as const,
  description,
});

// No role is attached on purpose: the logic function hands the agent the whole
// deal record up front, so it needs no tools and each run is one model call.
export default defineAgent({
  universalIdentifier: DEAL_COACH_AGENT_UNIVERSAL_IDENTIFIER,
  name: 'deal-coach',
  label: 'Deal coach',
  icon: 'IconBulb',
  description:
    'Reads an open deal with its WhatsApp messages, emails, call summaries, tasks and notes, and returns the next best action (reply, meeting, quote, call or task), the reason, a deal risk, a ready-to-send draft and any update the deal record needs.',
  prompt: DEAL_COACH_PROMPT,
  responseFormat: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        actionType: stringProperty(
          'One of REPLY, SCHEDULE_MEETING, SEND_QUOTE, CALL, TASK.',
        ),
        channel: stringProperty('One of WHATSAPP, EMAIL, NONE.'),
        nextAction: stringProperty(
          'One imperative sentence, at most 120 characters.',
        ),
        reason: stringProperty(
          'Evidence for the suggestion, at most 280 characters.',
        ),
        dueDate: stringProperty('YYYY-MM-DD, on or after today.'),
        risk: stringProperty('One of LOW, MEDIUM, HIGH.'),
        draftMessage: stringProperty(
          'Message body for WHATSAPP or EMAIL, talking points for CALL, empty for TASK.',
        ),
        emailSubject: stringProperty(
          'Subject line when the channel is EMAIL, otherwise empty.',
        ),
        meetingTitle: stringProperty(
          'Meeting title for SCHEDULE_MEETING, otherwise empty.',
        ),
        meetingStart: stringProperty(
          'Local start as YYYY-MM-DDTHH:mm for SCHEDULE_MEETING, otherwise empty.',
        ),
        meetingDurationMinutes: numberProperty(
          'Meeting length in minutes for SCHEDULE_MEETING, otherwise 0.',
        ),
        meetingLocation: stringProperty(
          'Address or "Video call" for SCHEDULE_MEETING, otherwise empty.',
        ),
        newStage: stringProperty(
          'One of the listed stage values when the stage should change, otherwise empty.',
        ),
        newCloseDate: stringProperty(
          'YYYY-MM-DD when the close date should change, otherwise empty.',
        ),
        newAmount: numberProperty(
          'New deal amount in its currency when it should change, otherwise 0.',
        ),
      },
      required: [
        'actionType',
        'channel',
        'nextAction',
        'reason',
        'dueDate',
        'risk',
        'draftMessage',
        'emailSubject',
        'meetingTitle',
        'meetingStart',
        'meetingDurationMinutes',
        'meetingLocation',
        'newStage',
        'newCloseDate',
        'newAmount',
      ],
      additionalProperties: false,
    },
  },
});
