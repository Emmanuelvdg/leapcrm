import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

export type ConversationMessageRecord = ObjectRecord & {
  body: string | null;
  direction: string;
  sentAt: string | null;
  receivedAt: string | null;
  deliveryStatus: string | null;
  conversationId: string;
};
