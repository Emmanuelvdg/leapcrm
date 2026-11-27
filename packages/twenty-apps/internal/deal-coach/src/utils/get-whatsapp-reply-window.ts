import { WHATSAPP_REPLY_WINDOW_HOURS } from 'src/constants/next-best-action-options';

const HOUR_MS = 60 * 60 * 1000;

export type WhatsappReplyWindow =
  | { state: 'NEVER_OPENED' }
  | { state: 'OPEN'; closesAt: string; hoursLeft: number }
  | { state: 'CLOSED'; closedAt: string };

export const getWhatsappReplyWindow = ({
  lastInboundAt,
  now,
}: {
  lastInboundAt: string | null;
  now: string;
}): WhatsappReplyWindow => {
  if (lastInboundAt === null || Number.isNaN(Date.parse(lastInboundAt))) {
    return { state: 'NEVER_OPENED' };
  }

  const closesAtMs =
    Date.parse(lastInboundAt) + WHATSAPP_REPLY_WINDOW_HOURS * HOUR_MS;
  const closesAt = new Date(closesAtMs).toISOString();
  const msLeft = closesAtMs - Date.parse(now);

  return msLeft > 0
    ? { state: 'OPEN', closesAt, hoursLeft: Math.floor(msLeft / HOUR_MS) }
    : { state: 'CLOSED', closedAt: closesAt };
};
