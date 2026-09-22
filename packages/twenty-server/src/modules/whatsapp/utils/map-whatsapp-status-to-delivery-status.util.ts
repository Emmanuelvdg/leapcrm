// Maps Meta's status webhook values to the SELECT options already registered on
// ConversationMessage.deliveryStatus (see
// compute-conversation-message-standard-flat-field-metadata.util.ts).
const WHATSAPP_STATUS_TO_DELIVERY_STATUS: Record<string, string> = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
};

export function mapWhatsappStatusToDeliveryStatus(
  status: string,
): string | null {
  return WHATSAPP_STATUS_TO_DELIVERY_STATUS[status] ?? null;
}
