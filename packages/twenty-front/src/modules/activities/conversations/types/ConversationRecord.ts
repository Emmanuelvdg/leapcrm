import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

export type ConversationRecord = ObjectRecord & {
  subject: string | null;
  status: string | null;
  isUnread: boolean;
  lastMessageAt: string | null;
  personId: string | null;
};
