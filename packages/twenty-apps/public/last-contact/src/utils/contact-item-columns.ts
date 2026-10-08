export type ContactItemKind = 'email' | 'meeting' | 'whatsapp';

export type ContactItemColumns = {
  lastContactItemMessageId: string | null;
  lastContactItemCalendarEventId: string | null;
  lastContactItemConversationMessageId: string | null;
};

export type ContactItemRelations = {
  lastContactItemMessage?: { id: string } | null;
  lastContactItemCalendarEvent?: { id: string } | null;
  lastContactItemConversationMessage?: { id: string } | null;
};

export const CONTACT_ITEM_COLUMN_NAMES: (keyof ContactItemColumns)[] = [
  'lastContactItemMessageId',
  'lastContactItemCalendarEventId',
  'lastContactItemConversationMessageId',
];

export const CONTACT_ITEM_RELATIONS_SELECTION = {
  lastContactItemMessage: { id: true },
  lastContactItemCalendarEvent: { id: true },
  lastContactItemConversationMessage: { id: true },
} as const;

// The last contact item is a morph relation, so exactly one join column holds
// the item and the others must be cleared when the item changes kind.
export const buildContactItemColumns = (
  kind: ContactItemKind | undefined,
  itemId: string | null,
): ContactItemColumns => ({
  lastContactItemMessageId: kind === 'email' ? itemId : null,
  lastContactItemCalendarEventId: kind === 'meeting' ? itemId : null,
  lastContactItemConversationMessageId: kind === 'whatsapp' ? itemId : null,
});

export const readContactItemColumns = (
  record: ContactItemRelations,
): ContactItemColumns => ({
  lastContactItemMessageId: record.lastContactItemMessage?.id ?? null,
  lastContactItemCalendarEventId:
    record.lastContactItemCalendarEvent?.id ?? null,
  lastContactItemConversationMessageId:
    record.lastContactItemConversationMessage?.id ?? null,
});
