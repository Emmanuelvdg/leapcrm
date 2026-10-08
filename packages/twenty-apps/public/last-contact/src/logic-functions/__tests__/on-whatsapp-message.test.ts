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

import onWhatsappMessage from '../on-whatsapp-message';

const PERSON_ID = '11111111-1111-1111-1111-111111111111';
const CONVERSATION_MESSAGE_ID = '22222222-2222-2222-2222-222222222222';
const ASSIGNEE_ID = '33333333-3333-3333-3333-333333333333';
const SENDER_ID = '44444444-4444-4444-4444-444444444444';
const COMPANY_ID = '55555555-5555-5555-5555-555555555555';
const OCCURRED_AT = '2026-06-10T09:00:00.000Z';

const handler = onWhatsappMessage.config.handler as (
  event: unknown,
) => Promise<void>;

const buildEvent = () => ({
  recordId: CONVERSATION_MESSAGE_ID,
  properties: { after: { id: CONVERSATION_MESSAGE_ID } },
});

type MessageOverrides = Record<string, unknown>;

const mockMessage = (overrides: MessageOverrides = {}) => {
  queryMock.mockImplementation(async (query: Record<string, unknown>) => {
    if (query.conversationMessage) {
      return {
        conversationMessage: {
          id: CONVERSATION_MESSAGE_ID,
          direction: 'INBOUND',
          channelType: 'WHATSAPP',
          isDraft: false,
          isInternalNote: false,
          receivedAt: OCCURRED_AT,
          sentAt: null,
          createdAt: OCCURRED_AT,
          createdBy: { workspaceMemberId: null },
          conversation: { personId: PERSON_ID, assignedToId: ASSIGNEE_ID },
          ...overrides,
        },
      };
    }

    return { person: { id: PERSON_ID, companyId: COMPANY_ID } };
  });
};

const findMutation = (name: string) =>
  mutationMock.mock.calls.find((call) => call[0][name])?.[0][name];

beforeEach(() => {
  queryMock.mockReset();
  mutationMock.mockReset();
  mutationMock.mockResolvedValue({ updatePeople: [{ id: PERSON_ID }] });
});

describe('on-whatsapp-message definition', () => {
  it('triggers when a conversation message is created', () => {
    expect(onWhatsappMessage.success).toBe(true);
    expect(onWhatsappMessage.config.databaseEventTriggerSettings).toEqual({
      eventName: 'conversationMessage.created',
    });
  });
});

describe('on-whatsapp-message handler', () => {
  it('credits an inbound message to the conversation assignee', async () => {
    mockMessage();

    await handler(buildEvent());

    expect(findMutation('updatePeople').__args.data).toEqual({
      lastContactAt: OCCURRED_AT,
      lastContactById: ASSIGNEE_ID,
      lastContactItemMessageId: null,
      lastContactItemCalendarEventId: null,
      lastContactItemConversationMessageId: CONVERSATION_MESSAGE_ID,
      lastInboundAt: OCCURRED_AT,
    });
    expect(findMutation('updateCompanies').__args.data).toEqual({
      lastContactAt: OCCURRED_AT,
      lastContactItemMessageId: null,
      lastContactItemCalendarEventId: null,
      lastContactItemConversationMessageId: CONVERSATION_MESSAGE_ID,
    });
    expect(findMutation('updateOpportunities').__args.filter.and[0]).toEqual({
      pointOfContactId: { eq: PERSON_ID },
    });
  });

  it('credits an outbound message to the team member who sent it', async () => {
    mockMessage({
      direction: 'OUTBOUND',
      receivedAt: null,
      sentAt: OCCURRED_AT,
      createdBy: { workspaceMemberId: SENDER_ID },
    });

    await handler(buildEvent());

    expect(findMutation('updatePeople').__args.data).toEqual({
      lastContactAt: OCCURRED_AT,
      lastContactById: SENDER_ID,
      lastContactItemMessageId: null,
      lastContactItemCalendarEventId: null,
      lastContactItemConversationMessageId: CONVERSATION_MESSAGE_ID,
      lastOutboundAt: OCCURRED_AT,
    });
  });

  it('falls back to the assignee for an outbound message sent by the system', async () => {
    mockMessage({
      direction: 'OUTBOUND',
      receivedAt: null,
      sentAt: OCCURRED_AT,
    });

    await handler(buildEvent());

    expect(findMutation('updatePeople').__args.data.lastContactById).toBe(
      ASSIGNEE_ID,
    );
  });

  it.each([
    ['a draft', { isDraft: true }],
    ['an internal note', { isInternalNote: true }],
    ['an email conversation message', { channelType: 'EMAIL' }],
    [
      'a conversation not linked to a person',
      { conversation: { personId: null, assignedToId: ASSIGNEE_ID } },
    ],
  ])('ignores %s', async (_label, overrides) => {
    mockMessage(overrides);

    await handler(buildEvent());

    expect(mutationMock).not.toHaveBeenCalled();
  });
});
