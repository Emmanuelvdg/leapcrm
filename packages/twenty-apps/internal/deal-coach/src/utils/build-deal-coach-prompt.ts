import {
  type DealContext,
  type DealMessage,
} from 'src/utils/deal-context.type';
import { getWhatsappReplyWindow } from 'src/utils/get-whatsapp-reply-window';

const MAX_MESSAGE_BODY_CHARACTERS = 1_200;
const MAX_CALL_SUMMARY_CHARACTERS = 2_500;
const MAX_NOTE_BODY_CHARACTERS = 800;
const MAX_PROMPT_CHARACTERS = 24_000;

const truncate = (text: string, maxCharacters: number): string =>
  text.length > maxCharacters
    ? `${text.slice(0, maxCharacters).trimEnd()} [...]`
    : text;

const formatDate = (isoDate: string | null): string =>
  isoDate === null ? 'unknown date' : isoDate.slice(0, 16).replace('T', ' ');

const daysBetween = (fromIsoDate: string, toIsoDate: string): number =>
  Math.floor(
    (Date.parse(toIsoDate) - Date.parse(fromIsoDate)) / (24 * 60 * 60 * 1000),
  );

const formatAmount = (context: DealContext): string => {
  const { amountMicros, currencyCode } = context.opportunity;

  if (amountMicros === null) {
    return 'not set';
  }

  const amount = (amountMicros / 1_000_000).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });

  return currencyCode ? `${amount} ${currencyCode}` : amount;
};

const describeSender = (message: DealMessage): string => {
  if (message.isInternalNote) {
    return 'Internal team note';
  }

  const side = message.direction === 'OUTBOUND' ? 'Us' : 'Contact';

  return message.senderName ? `${side} (${message.senderName})` : side;
};

const formatMessage = (message: DealMessage): string => {
  const header = `- [${formatDate(message.sentAt)}] ${message.channel === 'WHATSAPP' ? 'WhatsApp' : 'Email'} from ${describeSender(message)}`;
  const subject =
    message.subject !== null ? `\n  Subject: ${message.subject}` : '';
  const emptyBodyNotice =
    message.channel === 'EMAIL' ? '(content not shared)' : '(no text)';
  const body =
    message.body !== null && message.body.trim().length > 0
      ? `\n  ${truncate(message.body.trim(), MAX_MESSAGE_BODY_CHARACTERS).replace(/\n/g, '\n  ')}`
      : `\n  ${emptyBodyNotice}`;

  return `${header}${subject}${body}`;
};

const findLatestSentAt = (
  messages: DealMessage[],
  direction: DealMessage['direction'],
): string | null =>
  messages.reduce<string | null>(
    (latestSentAt, message) =>
      message.direction === direction &&
      !message.isInternalNote &&
      message.sentAt !== null &&
      (latestSentAt === null || message.sentAt > latestSentAt)
        ? message.sentAt
        : latestSentAt,
    null,
  );

// Keeps the newest messages that fit, so long histories lose their oldest part.
const formatConversation = (
  sortedMessages: DealMessage[],
  maxCharacters: number,
): string => {
  if (sortedMessages.length === 0) {
    return '## Conversation\nNo WhatsApp messages or emails recorded with this contact yet.';
  }

  const keptLines: string[] = [];
  let usedCharacters = 0;

  for (const message of [...sortedMessages].reverse()) {
    const line = formatMessage(message);

    if (usedCharacters + line.length > maxCharacters && keptLines.length > 0) {
      break;
    }

    keptLines.unshift(line);
    usedCharacters += line.length + 1;
  }

  const trimmedNotice =
    keptLines.length < sortedMessages.length
      ? `(${sortedMessages.length - keptLines.length} older messages left out)\n`
      : '';

  return `## Conversation (oldest first)\n${trimmedNotice}${keptLines.join('\n')}`;
};

const describeDaysAgo = (days: number): string => {
  if (days <= 0) {
    return 'today';
  }

  return days === 1 ? '1 day ago' : `${days} days ago`;
};

const describeLastContact = (
  label: string,
  latestSentAt: string | null,
  today: string,
): string =>
  latestSentAt === null
    ? `- ${label}: none recorded`
    : `- ${label}: ${formatDate(latestSentAt)} (${describeDaysAgo(daysBetween(latestSentAt.slice(0, 10), today))})`;

const describeStage = (context: DealContext): string => {
  const { stage } = context.opportunity;
  const stageLabel = context.stageOptions.find(
    (stageOption) => stageOption.value === stage,
  )?.label;

  return stageLabel && stageLabel !== stage
    ? `${stage} (${stageLabel})`
    : (stage ?? 'unknown');
};

const describeStageValues = (context: DealContext): string =>
  context.stageOptions.length > 0
    ? context.stageOptions
        .map((stageOption) => `${stageOption.value} (${stageOption.label})`)
        .join(', ')
    : 'unknown, do not suggest a stage change';

const describeWhatsappReplyWindow = (
  sortedMessages: DealMessage[],
  now: string,
): string => {
  const whatsappMessages = sortedMessages.filter(
    (message) => message.channel === 'WHATSAPP',
  );
  const replyWindow = getWhatsappReplyWindow({
    lastInboundAt: findLatestSentAt(whatsappMessages, 'INBOUND'),
    now,
  });

  if (replyWindow.state === 'OPEN') {
    return `open, closes ${formatDate(replyWindow.closesAt)} UTC (in about ${replyWindow.hoursLeft} hours)`;
  }

  if (replyWindow.state === 'CLOSED') {
    return `closed since ${formatDate(replyWindow.closedAt)} UTC, free-text WhatsApp messages cannot be sent`;
  }

  return 'the contact has never written on WhatsApp, free-text WhatsApp messages cannot be sent';
};

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const buildDealCoachPrompt = (context: DealContext): string => {
  const { opportunity, today } = context;
  const sortedMessages = [...context.messages].sort((first, second) =>
    (first.sentAt ?? '').localeCompare(second.sentAt ?? ''),
  );
  const weekday = WEEKDAYS[new Date(`${today}T12:00:00Z`).getUTCDay()];

  const sections: string[] = [
    `Today's date: ${today} (${weekday})`,
    [
      '## Deal',
      `- Name: ${opportunity.name ?? 'unnamed'}`,
      `- Stage: ${describeStage(context)}`,
      `- Open stage values: ${describeStageValues(context)}`,
      `- Amount: ${formatAmount(context)}`,
      `- Expected close date: ${opportunity.closeDate?.slice(0, 10) ?? 'not set'}`,
      `- Created: ${opportunity.createdAt?.slice(0, 10) ?? 'unknown'}`,
      `- Deal owner: ${context.ownerName ?? 'unassigned'}`,
      `- Company: ${context.company?.name ?? 'none'}${context.company?.domain ? ` (${context.company.domain})` : ''}`,
      `- Point of contact: ${context.pointOfContact?.name ?? 'none'}${context.pointOfContact?.jobTitle ? `, ${context.pointOfContact.jobTitle}` : ''}`,
      `- Contact email: ${context.pointOfContact?.email ?? 'none'}`,
      `- Contact phone: ${context.pointOfContact?.hasPhone ? 'on file' : 'none'}`,
      `- WhatsApp reply window: ${describeWhatsappReplyWindow(sortedMessages, context.now)}`,
      describeLastContact(
        'Last message from the contact',
        findLatestSentAt(sortedMessages, 'INBOUND'),
        today,
      ),
      describeLastContact(
        'Last message from us',
        findLatestSentAt(sortedMessages, 'OUTBOUND'),
        today,
      ),
    ].join('\n'),
  ];

  sections.push(
    context.tasks.length > 0
      ? `## Tasks on this deal\n${context.tasks
          .map(
            (task) =>
              `- ${task.title ?? 'Untitled task'} (status: ${task.status ?? 'unknown'}, due: ${task.dueAt?.slice(0, 10) ?? 'no date'})`,
          )
          .join('\n')}`
      : '## Tasks on this deal\nNone.',
  );

  if (context.callSummaries.length > 0) {
    sections.push(
      `## Call and meeting summaries (newest first)\n${context.callSummaries
        .map(
          (callSummary) =>
            `### ${callSummary.title ?? 'Call'} on ${formatDate(callSummary.startedAt)}\n${truncate(callSummary.summaryMarkdown.trim(), MAX_CALL_SUMMARY_CHARACTERS)}`,
        )
        .join('\n\n')}`,
    );
  }

  if (context.notes.length > 0) {
    sections.push(
      `## Notes (newest first)\n${context.notes
        .map(
          (note) =>
            `- [${formatDate(note.createdAt)}] ${note.title ?? 'Untitled note'}${note.bodyMarkdown ? `: ${truncate(note.bodyMarkdown.trim(), MAX_NOTE_BODY_CHARACTERS)}` : ''}`,
        )
        .join('\n')}`,
    );
  }

  const contextWithoutConversation = sections.join('\n\n');

  return `${contextWithoutConversation}\n\n${formatConversation(
    sortedMessages,
    MAX_PROMPT_CHARACTERS - contextWithoutConversation.length,
  )}`;
};
