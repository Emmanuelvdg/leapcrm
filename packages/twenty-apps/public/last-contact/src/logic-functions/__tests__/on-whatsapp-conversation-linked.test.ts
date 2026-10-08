import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, mutationMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  mutationMock: vi.fn(),
}));
vi.mock('twenty-client-sdk/core', () => ({
  CoreApiClient: vi.fn(function () {
    return { query: queryMock, mutation: mutationMock };
  }),
}));

import onWhatsappConversationLinked from '../on-whatsapp-conversation-linked';

const CONVERSATION_ID = '11111111-1111-1111-1111-111111111111';
const PERSON_ID = '22222222-2222-2222-2222-222222222222';
const ASSIGNEE_ID = '33333333-3333-3333-3333-333333333333';
const INBOUND_MESSAGE_ID = '44444444-4444-4444-4444-444444444444';
const OUTBOUND_MESSAGE_ID = '55555555-5555-5555-5555-555555555555';
const INBOUND_AT = '2026-06-10T09:00:00.000Z';
const OUTBOUND_AT = '2026-06-11T09:00:00.000Z';

const handler = onWhatsappConversationLinked.config.handler as (
  event: unknown,
) => Promise<void>;

const buildEvent = (personId: string | null) => ({
  recordId: CONVERSATION_ID,
  properties: {
    updatedFields: ['personId'],
    after: { id: CONVERSATION_ID, personId },
  },
});

type ConversationMessagesQuery = {
  conversationMessages: { __args: { filter: { direction: { eq: string } } } };
};

const mockConversation = (channelType: string) => {
  queryMock.mockImplementation(async (query: Record<string, unknown>) => {
    if (query.conversation) {
      return {
        conversation: {
          id: CONVERSATION_ID,
          channelType,
          assignedToId: ASSIGNEE_ID,
        },
      };
    }
    if (query.conversationMessages) {
      const direction = (query as ConversationMessagesQuery)
        .conversationMessages.__args.filter.direction.eq;
      const node =
        direction === 'INBOUND'
          ? {
              id: INBOUND_MESSAGE_ID,
              direction,
              receivedAt: INBOUND_AT,
              sentAt: null,
              createdAt: INBOUND_AT,
              createdBy: { workspaceMemberId: null },
            }
          : {
              id: OUTBOUND_MESSAGE_ID,
              direction,
              receivedAt: null,
              sentAt: OUTBOUND_AT,
              createdAt: OUTBOUND_AT,
              createdBy: { workspaceMemberId: null },
            };

      return { conversationMessages: { edges: [{ node }] } };
    }

    return { person: { id: PERSON_ID, companyId: null } };
  });
};

beforeEach(() => {
  queryMock.mockReset();
  mutationMock.mockReset();
  mutationMock.mockResolvedValue({ updatePeople: [{ id: PERSON_ID }] });
});

describe('on-whatsapp-conversation-linked definition', () => {
  it('only triggers when a conversation is linked to a person', () => {
    expect(onWhatsappConversationLinked.success).toBe(true);
    expect(
      onWhatsappConversationLinked.config.databaseEventTriggerSettings,
    ).toEqual({
      eventName: 'conversation.updated',
      updatedFields: ['personId'],
    });
  });
});

describe('on-whatsapp-conversation-linked handler', () => {
  it('counts the latest inbound and outbound messages for the linked person', async () => {
    mockConversation('WHATSAPP');

    await handler(buildEvent(PERSON_ID));

    const personUpdates = mutationMock.mock.calls
      .filter((call) => call[0].updatePeople)
      .map((call) => call[0].updatePeople.__args.data);

    expect(personUpdates).toEqual([
      expect.objectContaining({
        lastInboundAt: INBOUND_AT,
        lastContactItemConversationMessageId: INBOUND_MESSAGE_ID,
      }),
      expect.objectContaining({
        lastOutboundAt: OUTBOUND_AT,
        lastContactItemConversationMessageId: OUTBOUND_MESSAGE_ID,
      }),
    ]);
  });

  it('ignores email conversations', async () => {
    mockConversation('EMAIL');

    await handler(buildEvent(PERSON_ID));

    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('does nothing when the person is unlinked', async () => {
    await handler(buildEvent(null));

    expect(queryMock).not.toHaveBeenCalled();
    expect(mutationMock).not.toHaveBeenCalled();
  });
});
