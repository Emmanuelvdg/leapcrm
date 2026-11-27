export const NEXT_BEST_ACTION_TYPES = [
  'REPLY',
  'SCHEDULE_MEETING',
  'SEND_QUOTE',
  'CALL',
  'TASK',
] as const;

export type NextBestActionType = (typeof NEXT_BEST_ACTION_TYPES)[number];

export const MESSAGE_CHANNELS = ['WHATSAPP', 'EMAIL'] as const;

export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const DEAL_RISKS = ['LOW', 'MEDIUM', 'HIGH'] as const;

export type DealRisk = (typeof DEAL_RISKS)[number];

export const ACTION_TYPE_LABELS: Record<NextBestActionType, string> = {
  REPLY: 'Reply',
  SCHEDULE_MEETING: 'Schedule meeting',
  SEND_QUOTE: 'Send quote',
  CALL: 'Call',
  TASK: 'Task',
};

export const CHANNEL_LABELS: Record<MessageChannel, string> = {
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
};

export const DEAL_RISK_LABELS: Record<DealRisk, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

// Action types whose draft is a message to the contact.
export const MESSAGE_ACTION_TYPES: readonly NextBestActionType[] = [
  'REPLY',
  'SCHEDULE_MEETING',
  'SEND_QUOTE',
];

// WhatsApp Business only allows free-text messages within 24 hours of the
// contact's last message; after that only pre-approved templates can be sent.
export const WHATSAPP_REPLY_WINDOW_HOURS = 24;
