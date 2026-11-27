import {
  DEAL_RISKS,
  type DealRisk,
  MESSAGE_ACTION_TYPES,
  MESSAGE_CHANNELS,
  type MessageChannel,
  NEXT_BEST_ACTION_TYPES,
  type NextBestActionType,
} from 'src/constants/next-best-action-options';
import { type StageOption } from 'src/utils/deal-context.type';
import {
  type DealUpdateProposal,
  type MeetingProposal,
  type NextBestActionDetails,
} from 'src/utils/next-best-action-details.type';

export type NextBestAction = {
  actionType: NextBestActionType;
  channel: MessageChannel | null;
  nextAction: string;
  reason: string;
  dueDate: string;
  risk: DealRisk;
  draftMessage: string | null;
  details: NextBestActionDetails;
};

export type ParseNextBestActionContext = {
  today: string;
  stageOptions: StageOption[];
  currentStage: string | null;
  currentCloseDate: string | null;
  currentAmountMicros: number | null;
};

const MAX_NEXT_ACTION_CHARACTERS = 200;
const MAX_REASON_CHARACTERS = 500;
const MAX_DRAFT_CHARACTERS = 4_000;
const MAX_SUBJECT_CHARACTERS = 200;
const MAX_MEETING_TITLE_CHARACTERS = 150;
const MAX_LOCATION_CHARACTERS = 300;
const DEFAULT_MEETING_MINUTES = 30;
const MIN_MEETING_MINUTES = 15;
const MAX_MEETING_MINUTES = 480;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const SUBJECT_LINE_PATTERN = /^subject:\s*(.+)\n+/i;

const readString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const readNumber = (value: unknown): number | null => {
  const parsedValue =
    typeof value === 'number' ? value : Number(readString(value));

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const clamp = (text: string, maxCharacters: number): string =>
  text.length > maxCharacters ? text.slice(0, maxCharacters).trimEnd() : text;

const readEnumValue = <TValue extends string>(
  value: unknown,
  allowedValues: readonly TValue[],
): TValue | undefined => {
  const normalizedValue = readString(value).toUpperCase();

  return allowedValues.find((allowedValue) => allowedValue === normalizedValue);
};

const isValidDate = (date: string): boolean =>
  ISO_DATE_PATTERN.test(date) && !Number.isNaN(Date.parse(date));

// Models occasionally return a past date or prose; an invalid due date falls
// back to today so the suggestion still lands on the deal.
const readDueDate = (value: unknown, today: string): string => {
  const dueDate = readString(value).slice(0, 10);

  if (!isValidDate(dueDate)) {
    return today;
  }

  return dueDate < today ? today : dueDate;
};

const readMeeting = (
  output: Record<string, unknown>,
  nextAction: string,
  today: string,
): MeetingProposal | null => {
  const startLocal = readString(output.meetingStart).slice(0, 16);

  if (
    !LOCAL_DATE_TIME_PATTERN.test(startLocal) ||
    Number.isNaN(Date.parse(startLocal)) ||
    startLocal.slice(0, 10) < today
  ) {
    return null;
  }

  const durationMinutes = Math.round(
    readNumber(output.meetingDurationMinutes) ?? 0,
  );

  return {
    title: clamp(
      readString(output.meetingTitle) || nextAction,
      MAX_MEETING_TITLE_CHARACTERS,
    ),
    startLocal,
    durationMinutes:
      durationMinutes >= MIN_MEETING_MINUTES &&
      durationMinutes <= MAX_MEETING_MINUTES
        ? durationMinutes
        : DEFAULT_MEETING_MINUTES,
    location:
      clamp(readString(output.meetingLocation), MAX_LOCATION_CHARACTERS) ||
      null,
  };
};

// Only changes that differ from the record and that the record can hold are
// kept, so an empty proposal never shows an Apply button that does nothing.
const readDealUpdate = (
  output: Record<string, unknown>,
  context: ParseNextBestActionContext,
): DealUpdateProposal | null => {
  const proposedStage = readString(output.newStage).toUpperCase();
  const stageOption = context.stageOptions.find(
    (option) => option.value.toUpperCase() === proposedStage,
  );
  const stage =
    stageOption && stageOption.value !== context.currentStage
      ? stageOption
      : null;

  const proposedCloseDate = readString(output.newCloseDate).slice(0, 10);
  const closeDate =
    isValidDate(proposedCloseDate) &&
    proposedCloseDate >= context.today &&
    proposedCloseDate !== context.currentCloseDate?.slice(0, 10)
      ? proposedCloseDate
      : null;

  const proposedAmount = readNumber(output.newAmount);
  const proposedAmountMicros =
    proposedAmount !== null && proposedAmount > 0
      ? Math.round(proposedAmount * 1_000_000)
      : null;
  const amountMicros =
    proposedAmountMicros !== null &&
    proposedAmountMicros !== context.currentAmountMicros
      ? proposedAmountMicros
      : null;

  if (stage === null && closeDate === null && amountMicros === null) {
    return null;
  }

  return {
    stage: stage?.value ?? null,
    stageLabel: stage?.label ?? null,
    closeDate,
    amountMicros,
  };
};

const readActionType = (
  output: Record<string, unknown>,
): NextBestActionType => {
  const actionType = readEnumValue(output.actionType, NEXT_BEST_ACTION_TYPES);

  if (actionType !== undefined) {
    return actionType;
  }

  return readEnumValue(output.channel, MESSAGE_CHANNELS) !== undefined
    ? 'REPLY'
    : 'TASK';
};

export const parseNextBestAction = (
  result: unknown,
  context: ParseNextBestActionContext,
): NextBestAction | undefined => {
  if (typeof result !== 'object' || result === null) {
    return undefined;
  }

  const output = result as Record<string, unknown>;
  const nextAction = clamp(
    readString(output.nextAction),
    MAX_NEXT_ACTION_CHARACTERS,
  );

  if (nextAction.length === 0) {
    return undefined;
  }

  const actionType = readActionType(output);
  const channel = MESSAGE_ACTION_TYPES.includes(actionType)
    ? (readEnumValue(output.channel, MESSAGE_CHANNELS) ?? null)
    : null;

  let draftMessage = readString(output.draftMessage);
  let emailSubject = readString(output.emailSubject);

  // Older prompts put the subject on the first line of the draft.
  const subjectLineMatch = draftMessage.match(SUBJECT_LINE_PATTERN);

  if (subjectLineMatch !== null) {
    emailSubject = emailSubject || subjectLineMatch[1].trim();
    draftMessage = draftMessage.slice(subjectLineMatch[0].length).trim();
  }

  draftMessage = clamp(draftMessage, MAX_DRAFT_CHARACTERS);

  return {
    actionType,
    channel,
    nextAction,
    reason: clamp(readString(output.reason), MAX_REASON_CHARACTERS),
    dueDate: readDueDate(output.dueDate, context.today),
    risk: readEnumValue(output.risk, DEAL_RISKS) ?? 'MEDIUM',
    draftMessage:
      actionType === 'TASK' || draftMessage.length === 0 ? null : draftMessage,
    details: {
      emailSubject:
        channel === 'EMAIL' && emailSubject.length > 0
          ? clamp(emailSubject, MAX_SUBJECT_CHARACTERS)
          : null,
      meeting:
        actionType === 'SCHEDULE_MEETING'
          ? readMeeting(output, nextAction, context.today)
          : null,
      dealUpdate: readDealUpdate(output, context),
    },
  };
};
