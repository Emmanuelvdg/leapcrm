import {
  defineLogicFunction,
  type ObjectRecordCreateEvent,
} from 'twenty-sdk/define';
import { type DatabaseEventPayload } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { WHATSAPP_MESSAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  updatePersonLastContactFromWhatsappMessage,
  WHATSAPP_MESSAGE_SELECTION,
  type WhatsappMessageNode,
} from 'src/utils/update-person-last-contact-from-whatsapp';

type ConversationMessageCreate = { id?: string | null };

type ConversationMessageRecord = WhatsappMessageNode & {
  channelType?: string | null;
  isDraft?: boolean | null;
  isInternalNote?: boolean | null;
  conversation?: {
    personId: string | null;
    assignedToId: string | null;
  } | null;
};

const handler = async (
  event: DatabaseEventPayload<ObjectRecordCreateEvent<ConversationMessageCreate>>,
): Promise<void> => {
  const conversationMessageId = event.properties.after.id ?? event.recordId;

  if (!conversationMessageId) {
    return;
  }

  const client = new CoreApiClient();

  const { conversationMessage } = await client.query({
    conversationMessage: {
      __args: { filter: { id: { eq: conversationMessageId } } },
      ...WHATSAPP_MESSAGE_SELECTION,
      channelType: true,
      isDraft: true,
      isInternalNote: true,
      conversation: { personId: true, assignedToId: true },
    },
  });

  const message = conversationMessage as
    | ConversationMessageRecord
    | null
    | undefined;
  const personId = message?.conversation?.personId;

  if (
    !message ||
    !personId ||
    message.channelType !== 'WHATSAPP' ||
    message.isDraft ||
    message.isInternalNote
  ) {
    return;
  }

  await updatePersonLastContactFromWhatsappMessage(client, {
    personId,
    assignedToId: message.conversation?.assignedToId,
    message,
  });
};

export default defineLogicFunction({
  universalIdentifier: WHATSAPP_MESSAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'on-whatsapp-message',
  description:
    "Updates a person's last-contacted fields, and the last contact on their company and opportunities, when a WhatsApp message is sent or received.",
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'conversationMessage.created',
  },
  handler,
});
