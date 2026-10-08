import { type CoreApiClient } from 'twenty-client-sdk/core';

import {
  type InteractionDirection,
  updatePersonForInteraction,
} from 'src/utils/update-person-last-contact';
import { updateRelatedLastContact } from 'src/utils/update-related-last-contact';

export type WhatsappMessageNode = {
  id: string;
  direction?: string | null;
  sentAt?: string | null;
  receivedAt?: string | null;
  createdAt?: string | null;
  createdBy?: { workspaceMemberId?: string | null } | null;
};

export const WHATSAPP_MESSAGE_SELECTION = {
  id: true,
  direction: true,
  sentAt: true,
  receivedAt: true,
  createdAt: true,
  createdBy: { workspaceMemberId: true },
} as const;

export const getWhatsappMessageOccurredAt = (
  message: WhatsappMessageNode,
): string | null =>
  message.receivedAt || message.sentAt || message.createdAt || null;

export const getWhatsappMessageDirection = (
  message: WhatsappMessageNode,
): InteractionDirection =>
  message.direction === 'OUTBOUND' ? 'outbound' : 'inbound';

// Inbound messages have no sender on the team, so the conversation's assignee
// is the team member who owns that contact.
export const getWhatsappMessageOwnerId = (
  message: WhatsappMessageNode,
  assignedToId: string | null | undefined,
): string | null =>
  (getWhatsappMessageDirection(message) === 'outbound'
    ? message.createdBy?.workspaceMemberId || assignedToId
    : assignedToId) || null;

export const updatePersonLastContactFromWhatsappMessage = async (
  client: CoreApiClient,
  {
    personId,
    assignedToId,
    message,
  }: {
    personId: string;
    assignedToId: string | null | undefined;
    message: WhatsappMessageNode;
  },
): Promise<void> => {
  const occurredAt = getWhatsappMessageOccurredAt(message);

  if (!occurredAt) {
    return;
  }

  await updatePersonForInteraction(client, {
    personId,
    occurredAt,
    kind: 'whatsapp',
    itemId: message.id,
    workspaceMemberId: getWhatsappMessageOwnerId(message, assignedToId),
    direction: getWhatsappMessageDirection(message),
  });

  await updateRelatedLastContact(client, {
    personId,
    occurredAt,
    itemId: message.id,
    kind: 'whatsapp',
  });
};
