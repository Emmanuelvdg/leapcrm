import { type DealMessage } from 'src/utils/deal-context.type';

// The server replaces the subject and body of emails from mailboxes that do
// not share them with this placeholder (twenty-shared constant of the same name).
const FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED =
  'FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED';

export type EmailParticipantNode = {
  role: string | null;
  displayName: string | null;
  handle: string | null;
  personId: string | null;
  workspaceMemberId: string | null;
};

export type EmailMessageNode = {
  id: string;
  subject: string | null;
  text: string | null;
  receivedAt: string | null;
  participants: EmailParticipantNode[];
};

const readSharedText = (value: string | null): string | null =>
  value && value !== FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED
    ? value
    : null;

export const mapEmailMessage = (message: EmailMessageNode): DealMessage => {
  const sender = message.participants.find(
    (participant) => participant.role?.toUpperCase() === 'FROM',
  );

  return {
    channel: 'EMAIL',
    direction: sender?.workspaceMemberId ? 'OUTBOUND' : 'INBOUND',
    sentAt: message.receivedAt,
    senderName: sender?.displayName || sender?.handle || null,
    subject: readSharedText(message.subject),
    body: readSharedText(message.text),
    isInternalNote: false,
  };
};
