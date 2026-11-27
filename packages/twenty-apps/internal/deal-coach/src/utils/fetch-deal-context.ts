import { type CoreApiClient } from 'twenty-client-sdk/core';

import {
  type DealCallSummary,
  type DealContext,
  type DealMessage,
  type DealNote,
  type DealTask,
  type StageOption,
} from 'src/utils/deal-context.type';
import { executeWithRetry } from 'src/utils/execute-with-retry';
import {
  type EmailParticipantNode,
  mapEmailMessage,
} from 'src/utils/map-email-message';

const MAX_COMPANY_CONTACTS = 20;
const MAX_WHATSAPP_MESSAGES = 30;
const MAX_EMAIL_PARTICIPANT_ROWS = 60;
const MAX_EMAILS = 12;
const MAX_CALL_SUMMARIES = 3;
const MAX_TASKS = 20;
const MAX_NOTES = 3;

type FullName = { firstName: string | null; lastName: string | null } | null;

type Edges<TNode> = { edges: { node: TNode }[] } | null | undefined;

export type DealOpportunityNode = {
  id: string;
  name: string | null;
  stage: string | null;
  closeDate: string | null;
  createdAt: string | null;
  amount: {
    amountMicros: number | string | null;
    currencyCode: string | null;
  } | null;
  companyId: string | null;
  pointOfContactId: string | null;
  owner: { name: FullName } | null;
  company: {
    name: string | null;
    domainName: { primaryLinkUrl: string | null } | null;
  } | null;
  pointOfContact: {
    name: FullName;
    jobTitle: string | null;
    emails: { primaryEmail: string | null } | null;
    phones: { primaryPhoneNumber: string | null } | null;
  } | null;
  nextBestAction: string | null;
  nextBestActionUpdatedAt: string | null;
};

const nodesOf = <TNode>(connection: Edges<TNode>): TNode[] =>
  (connection?.edges ?? []).map((edge) => edge.node);

const formatFullName = (name: FullName | undefined): string | null => {
  const fullName = [name?.firstName, name?.lastName]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(' ');

  return fullName.length > 0 ? fullName : null;
};

const toNumberOrNull = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

export const fetchDealOpportunity = async (
  client: CoreApiClient,
  opportunityId: string,
): Promise<DealOpportunityNode | undefined> => {
  const { opportunity } = await executeWithRetry(() =>
    client.query({
      opportunity: {
        __args: { filter: { id: { eq: opportunityId } } },
        id: true,
        name: true,
        stage: true,
        closeDate: true,
        createdAt: true,
        amount: { amountMicros: true, currencyCode: true },
        companyId: true,
        pointOfContactId: true,
        owner: { name: { firstName: true, lastName: true } },
        company: { name: true, domainName: { primaryLinkUrl: true } },
        pointOfContact: {
          name: { firstName: true, lastName: true },
          jobTitle: true,
          emails: { primaryEmail: true },
          phones: { primaryPhoneNumber: true },
        },
        nextBestAction: true,
        nextBestActionUpdatedAt: true,
      },
    }),
  );

  return (opportunity as DealOpportunityNode | null) ?? undefined;
};

const fetchContactIds = async (
  client: CoreApiClient,
  opportunity: DealOpportunityNode,
): Promise<string[]> => {
  const contactIds = new Set<string>();

  if (opportunity.pointOfContactId) {
    contactIds.add(opportunity.pointOfContactId);
  }

  if (opportunity.companyId) {
    const { people } = await executeWithRetry(() =>
      client.query({
        people: {
          __args: {
            filter: { companyId: { eq: opportunity.companyId } },
            orderBy: [{ updatedAt: 'DescNullsLast' }],
            first: MAX_COMPANY_CONTACTS,
          },
          edges: { node: { id: true } },
        },
      }),
    );

    for (const person of nodesOf(people as Edges<{ id: string }>)) {
      contactIds.add(person.id);
    }
  }

  return [...contactIds];
};

type ConversationMessageNode = {
  direction: string | null;
  body: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string | null;
  isInternalNote: boolean | null;
  conversation: {
    person: { name: FullName } | null;
    assignedTo: { name: FullName } | null;
  } | null;
};

const fetchWhatsappMessages = async (
  client: CoreApiClient,
  opportunity: DealOpportunityNode,
  contactIds: string[],
): Promise<DealMessage[]> => {
  const conversationFilters: object[] = [
    { opportunityId: { eq: opportunity.id } },
  ];

  if (contactIds.length > 0) {
    conversationFilters.push({ personId: { in: contactIds } });
  }

  if (opportunity.companyId) {
    conversationFilters.push({ companyId: { eq: opportunity.companyId } });
  }

  const { conversations } = await executeWithRetry(() =>
    client.query({
      conversations: {
        __args: { filter: { or: conversationFilters }, first: 20 },
        edges: { node: { id: true } },
      },
    }),
  );

  const conversationIds = nodesOf(conversations as Edges<{ id: string }>).map(
    (conversation) => conversation.id,
  );

  if (conversationIds.length === 0) {
    return [];
  }

  const { conversationMessages } = await executeWithRetry(() =>
    client.query({
      conversationMessages: {
        __args: {
          filter: {
            conversationId: { in: conversationIds },
            isDraft: { eq: false },
          },
          orderBy: [{ createdAt: 'DescNullsLast' }],
          first: MAX_WHATSAPP_MESSAGES,
        },
        edges: {
          node: {
            direction: true,
            body: true,
            sentAt: true,
            receivedAt: true,
            createdAt: true,
            isInternalNote: true,
            conversation: {
              person: { name: { firstName: true, lastName: true } },
              assignedTo: { name: { firstName: true, lastName: true } },
            },
          },
        },
      },
    }),
  );

  return nodesOf(conversationMessages as Edges<ConversationMessageNode>).map(
    (message) => {
      const direction =
        message.direction?.toUpperCase() === 'OUTBOUND'
          ? 'OUTBOUND'
          : 'INBOUND';

      return {
        channel: 'WHATSAPP',
        direction,
        sentAt: message.receivedAt ?? message.sentAt ?? message.createdAt,
        senderName:
          direction === 'INBOUND'
            ? formatFullName(message.conversation?.person?.name)
            : formatFullName(message.conversation?.assignedTo?.name),
        subject: null,
        body: message.body,
        isInternalNote: message.isInternalNote === true,
      };
    },
  );
};

type EmailRowNode = {
  id: string;
  subject: string | null;
  text: string | null;
  receivedAt: string | null;
  messageParticipants: Edges<EmailParticipantNode>;
};

const fetchEmails = async (
  client: CoreApiClient,
  contactIds: string[],
): Promise<DealMessage[]> => {
  if (contactIds.length === 0) {
    return [];
  }

  const { messageParticipants } = await executeWithRetry(() =>
    client.query({
      messageParticipants: {
        __args: {
          filter: { personId: { in: contactIds } },
          orderBy: [{ createdAt: 'DescNullsLast' }],
          first: MAX_EMAIL_PARTICIPANT_ROWS,
        },
        edges: { node: { messageId: true } },
      },
    }),
  );

  const messageIds = [
    ...new Set(
      nodesOf(messageParticipants as Edges<{ messageId: string }>).map(
        (participant) => participant.messageId,
      ),
    ),
  ];

  if (messageIds.length === 0) {
    return [];
  }

  // Emails are read through the root messages query on purpose: the server
  // hides subjects and bodies there according to each mailbox's sharing
  // setting, which a nested read would not apply.
  const { messages } = await executeWithRetry(() =>
    client.query({
      messages: {
        __args: {
          filter: { id: { in: messageIds } },
          orderBy: [{ receivedAt: 'DescNullsLast' }],
          first: MAX_EMAILS,
        },
        edges: {
          node: {
            id: true,
            subject: true,
            text: true,
            receivedAt: true,
            messageParticipants: {
              edges: {
                node: {
                  role: true,
                  displayName: true,
                  handle: true,
                  personId: true,
                  workspaceMemberId: true,
                },
              },
            },
          },
        },
      },
    }),
  );

  return nodesOf(messages as Edges<EmailRowNode>).map(
    (message): DealMessage =>
      mapEmailMessage({
        id: message.id,
        subject: message.subject,
        text: message.text,
        receivedAt: message.receivedAt,
        participants: nodesOf(message.messageParticipants),
      }),
  );
};

type CallRecordingNode = {
  title: string | null;
  startedAt: string | null;
  summary: { markdown: string | null } | null;
};

const fetchCallSummaries = async (
  client: CoreApiClient,
  opportunity: DealOpportunityNode,
  contactIds: string[],
): Promise<DealCallSummary[]> => {
  const callRecordingFilters: object[] = [
    { opportunityId: { eq: opportunity.id } },
  ];

  if (contactIds.length > 0) {
    callRecordingFilters.push({ personId: { in: contactIds } });
  }

  const { callRecordings } = await executeWithRetry(() =>
    client.query({
      callRecordings: {
        __args: {
          filter: { or: callRecordingFilters },
          orderBy: [{ startedAt: 'DescNullsLast' }],
          first: MAX_CALL_SUMMARIES * 3,
        },
        edges: {
          node: { title: true, startedAt: true, summary: { markdown: true } },
        },
      },
    }),
  );

  return nodesOf(callRecordings as Edges<CallRecordingNode>)
    .filter(
      (callRecording) =>
        (callRecording.summary?.markdown ?? '').trim().length > 0,
    )
    .slice(0, MAX_CALL_SUMMARIES)
    .map((callRecording) => ({
      title: callRecording.title,
      startedAt: callRecording.startedAt,
      summaryMarkdown: callRecording.summary?.markdown ?? '',
    }));
};

const fetchTasks = async (
  client: CoreApiClient,
  opportunityId: string,
): Promise<DealTask[]> => {
  const { taskTargets } = await executeWithRetry(() =>
    client.query({
      taskTargets: {
        __args: {
          filter: { targetOpportunityId: { eq: opportunityId } },
          first: MAX_TASKS,
        },
        edges: {
          node: { task: { title: true, status: true, dueAt: true } },
        },
      },
    }),
  );

  return nodesOf(taskTargets as Edges<{ task: DealTask | null }>)
    .map((taskTarget) => taskTarget.task)
    .filter((task): task is DealTask => task !== null);
};

type NoteNode = {
  title: string | null;
  createdAt: string | null;
  bodyV2: { markdown: string | null } | null;
};

const fetchNotes = async (
  client: CoreApiClient,
  opportunityId: string,
): Promise<DealNote[]> => {
  const { noteTargets } = await executeWithRetry(() =>
    client.query({
      noteTargets: {
        __args: {
          filter: { targetOpportunityId: { eq: opportunityId } },
          first: 20,
        },
        edges: {
          node: {
            note: { title: true, createdAt: true, bodyV2: { markdown: true } },
          },
        },
      },
    }),
  );

  return nodesOf(noteTargets as Edges<{ note: NoteNode | null }>)
    .map((noteTarget) => noteTarget.note)
    .filter((note): note is NoteNode => note !== null)
    .sort((first, second) =>
      (second.createdAt ?? '').localeCompare(first.createdAt ?? ''),
    )
    .slice(0, MAX_NOTES)
    .map((note) => ({
      title: note.title,
      createdAt: note.createdAt,
      bodyMarkdown: note.bodyV2?.markdown ?? null,
    }));
};

// One unreadable source (a mailbox the app cannot see, a disabled object)
// should thin the context, not stop the deal from getting a suggestion.
const withEmptyFallback = async <TItem>(
  sourceName: string,
  fetchSource: () => Promise<TItem[]>,
): Promise<TItem[]> => {
  try {
    return await fetchSource();
  } catch (error) {
    console.warn(
      `Deal coach could not read ${sourceName}: ${error instanceof Error ? error.message : String(error)}`,
    );

    return [];
  }
};

export const fetchDealContext = async ({
  client,
  opportunity,
  stageOptions,
  now,
}: {
  client: CoreApiClient;
  opportunity: DealOpportunityNode;
  stageOptions: StageOption[];
  now: Date;
}): Promise<DealContext> => {
  const contactIds = await fetchContactIds(client, opportunity);

  const [whatsappMessages, emails, callSummaries, tasks, notes] =
    await Promise.all([
      withEmptyFallback('WhatsApp messages', () =>
        fetchWhatsappMessages(client, opportunity, contactIds),
      ),
      withEmptyFallback('emails', () => fetchEmails(client, contactIds)),
      withEmptyFallback('call recordings', () =>
        fetchCallSummaries(client, opportunity, contactIds),
      ),
      withEmptyFallback('tasks', () => fetchTasks(client, opportunity.id)),
      withEmptyFallback('notes', () => fetchNotes(client, opportunity.id)),
    ]);

  return {
    now: now.toISOString(),
    today: now.toISOString().slice(0, 10),
    stageOptions,
    opportunity: {
      id: opportunity.id,
      name: opportunity.name,
      stage: opportunity.stage,
      amountMicros: toNumberOrNull(opportunity.amount?.amountMicros),
      currencyCode: opportunity.amount?.currencyCode || null,
      closeDate: opportunity.closeDate,
      createdAt: opportunity.createdAt,
    },
    ownerName: formatFullName(opportunity.owner?.name),
    company: opportunity.company
      ? {
          name: opportunity.company.name,
          domain: opportunity.company.domainName?.primaryLinkUrl || null,
        }
      : null,
    pointOfContact: opportunity.pointOfContact
      ? {
          name: formatFullName(opportunity.pointOfContact.name),
          jobTitle: opportunity.pointOfContact.jobTitle || null,
          email: opportunity.pointOfContact.emails?.primaryEmail || null,
          hasPhone: Boolean(
            opportunity.pointOfContact.phones?.primaryPhoneNumber,
          ),
        }
      : null,
    messages: [...whatsappMessages, ...emails],
    callSummaries,
    tasks,
    notes,
  };
};
