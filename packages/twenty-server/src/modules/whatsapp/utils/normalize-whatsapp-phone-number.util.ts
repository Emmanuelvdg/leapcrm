// Meta's `wa_id` is the sender's phone number in international format without a
// leading '+' (e.g. "6589497704"). Conversation-participant channelHandle values
// are stored E.164 (with '+'), so normalize on the way in.
export function normalizeWaIdToE164(waId: string): string {
  const trimmed = waId.trim();

  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

// Strips everything but digits so phone numbers assembled from different parts
// (calling code + number, or a stored E.164 handle) can be compared regardless
// of '+', spaces, or dashes.
export function toDigitsOnly(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value.replace(/[^0-9]/g, '');
}
