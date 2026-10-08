import {
  defineLogicFunction,
  type ObjectRecordUpdateEvent,
} from 'twenty-sdk/define';
import { type DatabaseEventPayload } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { WHATSAPP_CONVERSATION_LINKED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  updatePersonLastContactFromWhatsappMessage,
  WHATSAPP_MESSAGE_SELECTION,
  type WhatsappMessageNode,
} from 'src/utils/update-person-last-contact-from-whatsapp';

type ConversationUpdate = { id?: string | null; personId?: string | null };

const findLatestMessage = async (
  client: CoreApiClient,
  conversationId: string,
  direction: 'INBOUND' | 'OUTBOUND',
): Promise<WhatsappMessageNode | undefined> => {
  const { conversationMessages } = await client.query({
    conversationMessages: {
      __args: {
        filter: {
          conversationId: { eq: conversationId },
          direction: { eq: direction },
          isDraft: { eq: false },
          isInternalNote: { eq: false },
        },
        orderBy: [
          direction === 'INBOUND'
            ? { receivedAt: 'DescNullsLast' }
            : { sentAt: 'DescNullsLast' },
        ],
        first: 1,
      },
      edges: { node: WHATSAPP_MESSAGE_SELECTION },
    },
  });

  return conversationMessages?.edges?.[0]?.node as
    | WhatsappMessageNode
    | undefined;
};

// A WhatsApp sender that matched no person is often linked to one later, which
// should count that conversation's history just like a newly matched email.
const handler = async (
  event: DatabaseEventPayload<ObjectRecordUpdateEvent<ConversationUpdate>>,
): Promise<void> => {
  const conversationId = event.properties.after.id ?? event.recordId;
  const personId = event.properties.after.personId;

  if (!conversationId || !personId) {
    return;
  }

  const client = new CoreApiClient();

  const { conversation } = await client.query({
    conversation: {
      __args: { filter: { id: { eq: conversationId } } },
      id: true,
      channelType: true,
      assignedToId: true,
    },
  });

  const current = conversation as
    | { channelType?: string | null; assignedToId?: string | null }
    | null
    | undefined;

  if (current?.channelType !== 'WHATSAPP') {
    return;
  }

  for (const direction of ['INBOUND', 'OUTBOUND'] as const) {
    const message = await findLatestMessage(client, conversationId, direction);

    if (message) {
      await updatePersonLastContactFromWhatsappMessage(client, {
        personId,
        assignedToId: current.assignedToId,
        message,
      });
    }
  }
};

export default defineLogicFunction({
  universalIdentifier:
    WHATSAPP_CONVERSATION_LINKED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'on-whatsapp-conversation-linked',
  description:
    "Counts a WhatsApp conversation's latest messages towards a person's last contact when the conversation is linked to that person.",
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'conversation.updated',
    updatedFields: ['personId'],
  },
  handler,
});
