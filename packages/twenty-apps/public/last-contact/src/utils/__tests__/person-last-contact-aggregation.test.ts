import { describe, expect, it, vi } from 'vitest';

import {
  buildPersonAggregates,
  buildPersonUpdateData,
  buildRelatedUpdateData,
  pickPersonLastContact,
} from 'src/utils/person-last-contact-aggregation';

const PERSON_ID = '11111111-1111-1111-1111-111111111111';
const EMAIL_MESSAGE_ID = '22222222-2222-2222-2222-222222222222';
const INBOUND_WHATSAPP_ID = '33333333-3333-3333-3333-333333333333';
const OUTBOUND_WHATSAPP_ID = '44444444-4444-4444-4444-444444444444';
const MEMBER_ID = '55555555-5555-5555-5555-555555555555';
const ASSIGNEE_ID = '66666666-6666-6666-6666-666666666666';

const EMAIL_AT = '2026-06-01T09:00:00.000Z';
const INBOUND_WHATSAPP_AT = '2026-06-05T09:00:00.000Z';
const OUTBOUND_WHATSAPP_AT = '2026-06-03T09:00:00.000Z';

const emptyPage = { edges: [], pageInfo: { hasNextPage: false } };

const buildClient = () => ({
  query: vi.fn(async (query: Record<string, { __args: { filter: object } }>) => {
    if (query.messageParticipants) {
      const isMemberLookup = 'messageId' in query.messageParticipants.__args.filter;

      return {
        messageParticipants: {
          edges: isMemberLookup
            ? [
                {
                  node: {
                    messageId: EMAIL_MESSAGE_ID,
                    role: 'FROM',
                    workspaceMemberId: MEMBER_ID,
                  },
                },
              ]
            : [
                {
                  node: {
                    personId: PERSON_ID,
                    message: { id: EMAIL_MESSAGE_ID, receivedAt: EMAIL_AT },
                  },
                },
              ],
          pageInfo: { hasNextPage: false },
        },
      };
    }
    if (query.conversationMessages) {
      const conversation = { personId: PERSON_ID, assignedToId: ASSIGNEE_ID };

      return {
        conversationMessages: {
          edges: [
            {
              node: {
                id: INBOUND_WHATSAPP_ID,
                direction: 'INBOUND',
                receivedAt: INBOUND_WHATSAPP_AT,
                sentAt: null,
                createdAt: INBOUND_WHATSAPP_AT,
                createdBy: { workspaceMemberId: null },
                conversation,
              },
            },
            {
              node: {
                id: OUTBOUND_WHATSAPP_ID,
                direction: 'OUTBOUND',
                receivedAt: null,
                sentAt: OUTBOUND_WHATSAPP_AT,
                createdAt: OUTBOUND_WHATSAPP_AT,
                createdBy: { workspaceMemberId: MEMBER_ID },
                conversation,
              },
            },
          ],
          pageInfo: { hasNextPage: false },
        },
      };
    }

    return { calendarEventParticipants: emptyPage };
  }),
});

describe('buildPersonAggregates', () => {
  it('folds WhatsApp messages in with emails and keeps the most recent contact', async () => {
    const client = buildClient();

    const aggByPersonId = await buildPersonAggregates(client as never, [
      PERSON_ID,
    ]);
    const agg = aggByPersonId.get(PERSON_ID);

    expect(agg && buildPersonUpdateData(agg)).toEqual({
      lastContactAt: INBOUND_WHATSAPP_AT,
      lastContactById: ASSIGNEE_ID,
      lastOutboundAt: OUTBOUND_WHATSAPP_AT,
      lastInboundAt: INBOUND_WHATSAPP_AT,
      lastEmailId: EMAIL_MESSAGE_ID,
      lastContactItemMessageId: null,
      lastContactItemCalendarEventId: null,
      lastContactItemConversationMessageId: INBOUND_WHATSAPP_ID,
    });

    const lastContact = pickPersonLastContact(agg);
    expect(lastContact && buildRelatedUpdateData(lastContact)).toEqual({
      lastContactAt: INBOUND_WHATSAPP_AT,
      lastContactItemMessageId: null,
      lastContactItemCalendarEventId: null,
      lastContactItemConversationMessageId: INBOUND_WHATSAPP_ID,
    });
  });

  it('only loads WhatsApp messages that are real contact with the given people', async () => {
    const client = buildClient();

    await buildPersonAggregates(client as never, [PERSON_ID]);

    const whatsappQuery = client.query.mock.calls.find(
      ([query]) => query.conversationMessages,
    )?.[0];
    expect(whatsappQuery?.conversationMessages.__args.filter).toEqual({
      channelType: { eq: 'WHATSAPP' },
      isDraft: { eq: false },
      isInternalNote: { eq: false },
      conversation: { personId: { in: [PERSON_ID] } },
    });
  });
});
