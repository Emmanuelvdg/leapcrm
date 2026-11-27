import { type CSSProperties, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { copyToClipboard, useRecordId } from 'twenty-sdk/front-component';

import {
  ACTION_TYPE_LABELS,
  CHANNEL_LABELS,
  DEAL_RISK_LABELS,
  type DealRisk,
  type MessageChannel,
  type NextBestActionType,
} from 'src/constants/next-best-action-options';
import { NEXT_BEST_ACTION_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  type NextBestActionRecord,
  useNextBestAction,
} from 'src/front-components/hooks/use-next-best-action';
import { applyDealUpdate } from 'src/front-components/utils/apply-deal-update';
import { createFollowUpTask } from 'src/front-components/utils/create-follow-up-task';
import { createMeetingEvent } from 'src/front-components/utils/create-meeting-event';
import { formatRelativeTime } from 'src/front-components/utils/format-relative-time';
import { openEmailDraft } from 'src/front-components/utils/open-email-draft';
import { openWhatsappDraft } from 'src/front-components/utils/open-whatsapp-draft';
import { requestDealRefresh } from 'src/front-components/utils/request-deal-refresh';
import { describeDealUpdate } from 'src/utils/describe-deal-update';
import { getWhatsappReplyWindow } from 'src/utils/get-whatsapp-reply-window';
import { formatMeetingStart } from 'src/utils/meeting-times';

// Theme tokens are inlined as CSS-variable values: the SDK mocks the UI package
// during manifest extraction, so importing them at module level would be undefined.
const theme = {
  spacing1: 'var(--t-spacing-1)',
  spacing2: 'var(--t-spacing-2)',
  spacing3: 'var(--t-spacing-3)',
  spacing4: 'var(--t-spacing-4)',
  spacing8: 'var(--t-spacing-8)',
  bgPrimary: 'var(--t-background-primary)',
  bgSecondary: 'var(--t-background-secondary)',
  bgOrange: 'var(--t-background-transparent-orange)',
  borderMedium: 'var(--t-border-color-medium)',
  radiusSm: 'var(--t-border-radius-sm)',
  radiusMd: 'var(--t-border-radius-md)',
  fontPrimary: 'var(--t-font-color-primary)',
  fontSecondary: 'var(--t-font-color-secondary)',
  fontTertiary: 'var(--t-font-color-tertiary)',
  fontLight: 'var(--t-font-color-light)',
  fontInverted: 'var(--t-font-color-inverted)',
  fontFamily: 'var(--t-font-family)',
  sizeXs: 'var(--t-font-size-xs)',
  sizeSm: 'var(--t-font-size-sm)',
  sizeLg: 'var(--t-font-size-lg)',
  weightMedium: 'var(--t-font-weight-medium)',
  weightSemiBold: 'var(--t-font-weight-semi-bold)',
  blue: 'var(--t-color-blue)',
};

const RISK_COLORS: Record<DealRisk, string> = {
  LOW: 'green',
  MEDIUM: 'orange',
  HIGH: 'red',
};

const CHANNEL_COLORS: Record<MessageChannel, string> = {
  WHATSAPP: 'green',
  EMAIL: 'blue',
};

const ACTION_TYPE_COLORS: Record<NextBestActionType, string> = {
  REPLY: 'blue',
  SCHEDULE_MEETING: 'turquoise',
  SEND_QUOTE: 'orange',
  CALL: 'purple',
  TASK: 'gray',
};

const styles: Record<string, CSSProperties> = {
  container: {
    background: theme.bgPrimary,
    boxSizing: 'border-box',
    color: theme.fontPrimary,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    gap: theme.spacing4,
    height: '100%',
    overflowY: 'auto',
    padding: theme.spacing4,
    width: '100%',
  },
  headerRow: {
    alignItems: 'center',
    display: 'flex',
    gap: theme.spacing2,
  },
  eyebrow: {
    color: theme.fontTertiary,
    flex: 1,
    fontSize: theme.sizeXs,
    fontWeight: theme.weightMedium,
    letterSpacing: '0.04em',
    margin: 0,
    textTransform: 'uppercase',
  },
  action: {
    fontSize: theme.sizeLg,
    fontWeight: theme.weightSemiBold,
    lineHeight: 1.4,
    margin: 0,
  },
  metaRow: {
    alignItems: 'center',
    color: theme.fontTertiary,
    display: 'flex',
    flexWrap: 'wrap',
    fontSize: theme.sizeXs,
    gap: theme.spacing2,
    marginTop: theme.spacing2,
  },
  reason: { color: theme.fontSecondary, lineHeight: 1.5, margin: 0 },
  card: {
    background: theme.bgSecondary,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusMd,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing2,
    padding: theme.spacing3,
  },
  notice: {
    background: theme.bgOrange,
    borderRadius: theme.radiusMd,
    color: theme.fontSecondary,
    lineHeight: 1.5,
    margin: 0,
    padding: theme.spacing3,
  },
  sectionHeader: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: theme.spacing2,
  },
  sectionTitle: {
    color: theme.fontSecondary,
    fontSize: theme.sizeXs,
    fontWeight: theme.weightMedium,
    margin: 0,
  },
  draft: {
    background: theme.bgSecondary,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusMd,
    boxSizing: 'border-box',
    lineHeight: 1.5,
    margin: 0,
    padding: theme.spacing3,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  subject: { fontWeight: theme.weightMedium, margin: 0 },
  buttonRow: { display: 'flex', flexWrap: 'wrap', gap: theme.spacing2 },
  button: {
    alignItems: 'center',
    borderRadius: theme.radiusSm,
    cursor: 'pointer',
    display: 'inline-flex',
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    fontWeight: theme.weightMedium,
    height: theme.spacing8,
    padding: `0 ${theme.spacing3}`,
  },
  primaryButton: {
    background: theme.blue,
    border: '1px solid transparent',
    color: theme.fontInverted,
  },
  secondaryButton: {
    background: theme.bgPrimary,
    border: `1px solid ${theme.borderMedium}`,
    color: theme.fontSecondary,
  },
  smallButton: {
    background: 'transparent',
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusSm,
    color: theme.fontSecondary,
    cursor: 'pointer',
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeXs,
    padding: `${theme.spacing1} ${theme.spacing2}`,
  },
  disabledButton: { cursor: 'not-allowed', opacity: 0.6 },
  helper: { color: theme.fontLight, fontSize: theme.sizeXs, margin: 0 },
  centered: {
    alignItems: 'center',
    color: theme.fontTertiary,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing3,
    height: '100%',
    justifyContent: 'center',
    textAlign: 'center',
  },
};

const Pill = ({ label, color }: { label: string; color: string }) => (
  <span
    style={{
      background: `var(--t-tag-background-${color})`,
      borderRadius: theme.radiusSm,
      color: `var(--t-tag-text-${color})`,
      fontSize: theme.sizeXs,
      fontWeight: theme.weightMedium,
      padding: `2px ${theme.spacing2}`,
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </span>
);

type ActionButtonProps = {
  label: string;
  onClick: () => void;
  isPrimary?: boolean;
  isDisabled?: boolean;
  title?: string;
};

const ActionButton = ({
  label,
  onClick,
  isPrimary = false,
  isDisabled = false,
  title,
}: ActionButtonProps) => (
  <button
    type="button"
    disabled={isDisabled}
    title={title}
    onClick={onClick}
    style={{
      ...styles.button,
      ...(isPrimary ? styles.primaryButton : styles.secondaryButton),
      ...(isDisabled ? styles.disabledButton : {}),
    }}
  >
    {label}
  </button>
);

const isOneOf = <TValue extends string>(
  value: string | null,
  values: Record<TValue, string>,
): value is TValue => value !== null && value in values;

const draftTitle = (record: NextBestActionRecord): string => {
  if (record.nextBestActionType === 'CALL') {
    return 'Talking points';
  }

  if (record.nextBestActionChannel === 'WHATSAPP') {
    return 'Draft WhatsApp message';
  }

  if (record.nextBestActionChannel === 'EMAIL') {
    return 'Draft email';
  }

  return 'Draft follow-up';
};

// Returns why WhatsApp cannot take a free-text message right now, if it cannot.
const getWhatsappBlocker = (record: NextBestActionRecord): string | null => {
  if (record.nextBestActionChannel !== 'WHATSAPP') {
    return null;
  }

  if (!record.whatsappConversation) {
    return 'There is no WhatsApp conversation with this contact yet, and WhatsApp only allows an approved template as the first message. Copy the draft, call, or regenerate for email.';
  }

  const replyWindow = getWhatsappReplyWindow({
    lastInboundAt: record.whatsappConversation.lastInboundAt,
    now: new Date().toISOString(),
  });

  return replyWindow.state === 'OPEN'
    ? null
    : 'The contact has not written on WhatsApp in the last 24 hours, so WhatsApp only allows an approved template now. Copy the draft, call, or regenerate for email.';
};

type SuggestionProps = {
  record: NextBestActionRecord;
  isRefreshing: boolean;
  onRegenerate: () => void;
  onRecordChanged: () => void;
};

const Suggestion = ({
  record,
  isRefreshing,
  onRegenerate,
  onRecordChanged,
}: SuggestionProps) => {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const actionType = record.nextBestActionType;
  const channel = record.nextBestActionChannel;
  const risk = record.dealRisk;
  const meeting = record.nextBestActionDetails?.meeting ?? null;
  const dealUpdate = record.nextBestActionDetails?.dealUpdate ?? null;
  const emailSubject = record.nextBestActionDetails?.emailSubject ?? null;
  const whatsappBlocker = getWhatsappBlocker(record);
  const hasDraft = Boolean(record.nextBestActionDraft);

  const runAction = async (
    actionName: string,
    action: () => Promise<unknown>,
  ) => {
    setBusyAction(actionName);
    await action();
    setBusyAction(null);
  };

  const isBusy = busyAction !== null;

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <p style={styles.eyebrow}>Next best action</p>
        {isOneOf(actionType, ACTION_TYPE_LABELS) && (
          <Pill
            label={ACTION_TYPE_LABELS[actionType]}
            color={ACTION_TYPE_COLORS[actionType]}
          />
        )}
        {isOneOf(risk, DEAL_RISK_LABELS) && (
          <Pill
            label={`${DEAL_RISK_LABELS[risk]} risk`}
            color={RISK_COLORS[risk]}
          />
        )}
      </div>

      <div>
        <p style={styles.action}>{record.nextBestAction}</p>
        <div style={styles.metaRow}>
          {isOneOf(channel, CHANNEL_LABELS) && (
            <Pill
              label={CHANNEL_LABELS[channel]}
              color={CHANNEL_COLORS[channel]}
            />
          )}
          {record.nextBestActionDueDate && (
            <span>Due {record.nextBestActionDueDate}</span>
          )}
          {record.nextBestActionUpdatedAt && (
            <span>
              · Suggested {formatRelativeTime(record.nextBestActionUpdatedAt)}
            </span>
          )}
        </div>
      </div>

      {record.nextBestActionReason && (
        <p style={styles.reason}>{record.nextBestActionReason}</p>
      )}

      {whatsappBlocker && <p style={styles.notice}>{whatsappBlocker}</p>}

      {meeting && (
        <div style={styles.card}>
          <p style={styles.sectionTitle}>Proposed meeting</p>
          <p style={styles.subject}>{meeting.title}</p>
          <span style={{ color: theme.fontSecondary }}>
            {formatMeetingStart(meeting)} · {meeting.durationMinutes} min
            {meeting.location ? ` · ${meeting.location}` : ''}
          </span>
        </div>
      )}

      {hasDraft && (
        <div>
          <div style={styles.sectionHeader}>
            <p style={styles.sectionTitle}>{draftTitle(record)}</p>
            <button
              type="button"
              style={styles.smallButton}
              onClick={() => {
                void copyToClipboard(
                  emailSubject
                    ? `Subject: ${emailSubject}\n\n${record.nextBestActionDraft ?? ''}`
                    : (record.nextBestActionDraft ?? ''),
                );
              }}
            >
              Copy
            </button>
          </div>
          <div style={styles.draft}>
            {emailSubject && (
              <p style={{ ...styles.subject, marginBottom: theme.spacing2 }}>
                Subject: {emailSubject}
              </p>
            )}
            {record.nextBestActionDraft}
          </div>
        </div>
      )}

      {dealUpdate && (
        <div style={styles.card}>
          <p style={styles.sectionTitle}>Suggested deal update</p>
          <span>
            {describeDealUpdate(dealUpdate, record.currencyCode).join(' · ')}
          </span>
          <div>
            <ActionButton
              label={busyAction === 'apply' ? 'Updating…' : 'Apply'}
              isDisabled={isBusy}
              onClick={() => {
                void runAction('apply', async () => {
                  if (await applyDealUpdate(record)) {
                    onRecordChanged();
                  }
                });
              }}
            />
          </div>
        </div>
      )}

      <div style={styles.buttonRow}>
        {channel === 'WHATSAPP' && hasDraft && (
          <ActionButton
            label={busyAction === 'whatsapp' ? 'Opening…' : 'Open in WhatsApp'}
            isPrimary
            isDisabled={isBusy || whatsappBlocker !== null}
            title={whatsappBlocker ?? undefined}
            onClick={() => {
              void runAction('whatsapp', () => openWhatsappDraft(record));
            }}
          />
        )}
        {channel === 'EMAIL' && hasDraft && (
          <ActionButton
            label={busyAction === 'email' ? 'Opening…' : 'Open in email'}
            isPrimary
            isDisabled={isBusy}
            onClick={() => {
              void runAction('email', () => openEmailDraft(record));
            }}
          />
        )}
        {actionType === 'SCHEDULE_MEETING' && meeting && (
          <ActionButton
            label={
              busyAction === 'meeting' ? 'Creating…' : 'Create calendar event'
            }
            isPrimary={channel === null}
            isDisabled={isBusy}
            onClick={() => {
              void runAction('meeting', () => createMeetingEvent(record));
            }}
          />
        )}
        <ActionButton
          label={busyAction === 'task' ? 'Creating task…' : 'Create task'}
          isPrimary={channel === null && actionType !== 'SCHEDULE_MEETING'}
          isDisabled={isBusy}
          onClick={() => {
            void runAction('task', () => createFollowUpTask(record));
          }}
        />
        <ActionButton
          label={isRefreshing ? 'Thinking…' : 'Regenerate'}
          isDisabled={isRefreshing || isBusy}
          onClick={onRegenerate}
        />
      </div>

      <p style={styles.helper}>
        Suggested by the Deal coach AI agent from this deal’s messages, calls,
        tasks and notes. Nothing is sent until you send it yourself.
      </p>
    </div>
  );
};

const NextBestAction = () => {
  const opportunityId = useRecordId();
  const { record, isLoading, errorMessage, reload } =
    useNextBestAction(opportunityId);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRegenerate = async () => {
    if (opportunityId === null) {
      return;
    }

    setIsRefreshing(true);
    await requestDealRefresh([opportunityId]);
    setIsRefreshing(false);
    reload();
  };

  if (opportunityId === null) {
    return (
      <div style={{ ...styles.container, ...styles.centered }}>
        Open a deal to see its next best action.
      </div>
    );
  }

  if (isLoading && record === undefined) {
    return (
      <div style={{ ...styles.container, ...styles.centered }}>Loading…</div>
    );
  }

  if (errorMessage !== undefined) {
    return (
      <div style={{ ...styles.container, ...styles.centered }}>
        {errorMessage}
      </div>
    );
  }

  if (record === undefined || !record.nextBestAction) {
    return (
      <div style={{ ...styles.container, ...styles.centered }}>
        <p style={{ margin: 0 }}>
          No suggestion yet. The Deal coach agent looks at open deals when new
          messages or calls come in, and every night.
        </p>
        <ActionButton
          label={isRefreshing ? 'Thinking…' : 'Suggest next step'}
          isPrimary
          isDisabled={isRefreshing}
          onClick={() => {
            void handleRegenerate();
          }}
        />
      </div>
    );
  }

  return (
    <Suggestion
      record={record}
      isRefreshing={isRefreshing}
      onRegenerate={() => {
        void handleRegenerate();
      }}
      onRecordChanged={reload}
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: NEXT_BEST_ACTION_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'next-best-action',
  description:
    'Shows the Deal coach suggestion for a deal and carries it out in one click: open the drafted WhatsApp or email in its composer, create the calendar event, apply the suggested deal update or create a task.',
  component: NextBestAction,
});
