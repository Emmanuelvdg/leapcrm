import { type CoreApiClient } from 'twenty-client-sdk/core';

import { MAX_MESSAGE_AGE_FOR_REFRESH_HOURS } from 'src/constants/deal-coach-settings';
import { executeWithRetry } from 'src/utils/execute-with-retry';
import {
  type DealCoachSettings,
  isClosedStage,
} from 'src/utils/get-deal-coach-settings';
import {
  type ActivitySignal,
  type CandidateDeal,
  hasStageOrCloseDateChange,
  isRecentEnough,
  selectDealsToRefresh,
} from 'src/utils/select-deals-to-refresh';

const PAGE_SIZE = 100;
const MAX_ROWS_PER_SOURCE = 1_000;
const MAX_IDS_PER_FILTER = 300;

type Connection<TNode> = {
  edges: { node: TNode }[];
  pageInfo: { hasNextPage: boolean | null; endCursor: string | null };
} | null;

// Pages through one object until it runs out or hits the row cap, so a burst
// (a mailbox import) cannot make one run read without bound.
const fetchAllPages = async <TNode>(
  fetchPage: (cursor: string | undefined) => Promise<Connection<TNode>>,
): Promise<TNode[]> => {
  const nodes: TNode[] = [];
  let cursor: string | undefined;

  while (nodes.length < MAX_ROWS_PER_SOURCE) {
    const connection = await executeWithRetry(() => fetchPage(cursor));

    nodes.push(...(connection?.edges ?? []).map((edge) => edge.node));

    if (!connection?.pageInfo.hasNextPage) {
      break;
    }

    cursor = connection.pageInfo.endCursor ?? undefined;
  }

  return nodes;
};

const PAGE_INFO_SELECTION = { hasNextPage: true, endCursor: true } as const;

const fetchWhatsappSignals = async (
  client: CoreApiClient,
  since: string,
  now: Date,
): Promise<ActivitySignal[]> => {
  type Node = {
    createdAt: string;
    sentAt: string | null;
    receivedAt: string | null;
    conversation: {
      opportunityId: string | null;
      personId: string | null;
      companyId: string | null;
    } | null;
  };

  const nodes = await fetchAllPages<Node>(async (cursor) => {
    const { conversationMessages } = await client.query({
      conversationMessages: {
        __args: {
          filter: { createdAt: { gte: since }, isDraft: { eq: false } },
          first: PAGE_SIZE,
          after: cursor,
        },
        edges: {
          node: {
            createdAt: true,
            sentAt: true,
            receivedAt: true,
            conversation: {
              opportunityId: true,
              personId: true,
              companyId: true,
            },
          },
        },
        pageInfo: PAGE_INFO_SELECTION,
      },
    });

    return conversationMessages as Connection<Node>;
  });

  return nodes
    .filter(
      (node) =>
        node.conversation !== null &&
        isRecentEnough({
          at: node.receivedAt ?? node.sentAt ?? node.createdAt,
          now,
          maxAgeHours: MAX_MESSAGE_AGE_FOR_REFRESH_HOURS,
        }),
    )
    .map((node) => ({
      opportunityId: node.conversation?.opportunityId ?? null,
      personId: node.conversation?.personId ?? null,
      companyId: node.conversation?.companyId ?? null,
      at: node.createdAt,
      canCloseDeal: false,
    }));
};

const fetchEmailSignals = async (
  client: CoreApiClient,
  since: string,
  now: Date,
): Promise<ActivitySignal[]> => {
  type Node = {
    updatedAt: string;
    personId: string | null;
    person: { companyId: string | null } | null;
    message: { receivedAt: string | null } | null;
  };

  // Participants are matched to people after they are created, so updatedAt
  // catches both new emails and ones that just got linked to a contact.
  const nodes = await fetchAllPages<Node>(async (cursor) => {
    const { messageParticipants } = await client.query({
      messageParticipants: {
        __args: {
          filter: {
            updatedAt: { gte: since },
            personId: { is: 'NOT_NULL' },
          },
          first: PAGE_SIZE,
          after: cursor,
        },
        edges: {
          node: {
            updatedAt: true,
            personId: true,
            person: { companyId: true },
            message: { receivedAt: true },
          },
        },
        pageInfo: PAGE_INFO_SELECTION,
      },
    });

    return messageParticipants as Connection<Node>;
  });

  return nodes
    .filter((node) =>
      isRecentEnough({
        at: node.message?.receivedAt ?? null,
        now,
        maxAgeHours: MAX_MESSAGE_AGE_FOR_REFRESH_HOURS,
      }),
    )
    .map((node) => ({
      opportunityId: null,
      personId: node.personId,
      companyId: node.person?.companyId ?? null,
      at: node.updatedAt,
      canCloseDeal: false,
    }));
};

const fetchCallRecordingSignals = async (
  client: CoreApiClient,
  since: string,
): Promise<ActivitySignal[]> => {
  type Node = {
    updatedAt: string;
    opportunityId: string | null;
    personId: string | null;
    companyId: string | null;
    summary: { markdown: string | null } | null;
  };

  const nodes = await fetchAllPages<Node>(async (cursor) => {
    const { callRecordings } = await client.query({
      callRecordings: {
        __args: {
          filter: { updatedAt: { gte: since } },
          first: PAGE_SIZE,
          after: cursor,
        },
        edges: {
          node: {
            updatedAt: true,
            opportunityId: true,
            personId: true,
            companyId: true,
            summary: { markdown: true },
          },
        },
        pageInfo: PAGE_INFO_SELECTION,
      },
    });

    return callRecordings as Connection<Node>;
  });

  return nodes
    .filter((node) => (node.summary?.markdown ?? '').trim().length > 0)
    .map((node) => ({
      opportunityId: node.opportunityId,
      personId: node.personId,
      companyId: node.companyId,
      at: node.updatedAt,
      canCloseDeal: false,
    }));
};

const fetchStageChangeSignals = async (
  client: CoreApiClient,
  since: string,
): Promise<ActivitySignal[]> => {
  type Node = {
    updatedAt: string;
    targetOpportunityId: string | null;
    properties: unknown;
  };

  const nodes = await fetchAllPages<Node>(async (cursor) => {
    const { timelineActivities } = await client.query({
      timelineActivities: {
        __args: {
          filter: {
            name: { eq: 'opportunity.updated' },
            updatedAt: { gte: since },
            targetOpportunityId: { is: 'NOT_NULL' },
          },
          first: PAGE_SIZE,
          after: cursor,
        },
        edges: {
          node: {
            updatedAt: true,
            targetOpportunityId: true,
            properties: true,
          },
        },
        pageInfo: PAGE_INFO_SELECTION,
      },
    });

    return timelineActivities as Connection<Node>;
  });

  return nodes
    .filter((node) => hasStageOrCloseDateChange(node.properties))
    .map((node) => ({
      opportunityId: node.targetOpportunityId,
      personId: null,
      companyId: null,
      at: node.updatedAt,
      canCloseDeal: true,
    }));
};

const uniqueIds = (ids: (string | null)[]): string[] =>
  [...new Set(ids.filter((id): id is string => id !== null))].slice(
    0,
    MAX_IDS_PER_FILTER,
  );

const CANDIDATE_DEAL_SELECTION = {
  id: true,
  stage: true,
  pointOfContactId: true,
  companyId: true,
  nextBestActionUpdatedAt: true,
} as const;

const fetchCandidateDeals = async (
  client: CoreApiClient,
  signals: ActivitySignal[],
): Promise<CandidateDeal[]> => {
  const opportunityIds = uniqueIds(
    signals.map((signal) => signal.opportunityId),
  );
  const personIds = uniqueIds(signals.map((signal) => signal.personId));
  const companyIds = uniqueIds(signals.map((signal) => signal.companyId));

  const filters: object[] = [];

  if (opportunityIds.length > 0) {
    filters.push({ id: { in: opportunityIds } });
  }

  if (personIds.length > 0) {
    filters.push({ pointOfContactId: { in: personIds } });
  }

  if (companyIds.length > 0) {
    filters.push({ companyId: { in: companyIds } });
  }

  if (filters.length === 0) {
    return [];
  }

  return fetchAllPages<CandidateDeal>(async (cursor) => {
    const { opportunities } = await client.query({
      opportunities: {
        __args: { filter: { or: filters }, first: PAGE_SIZE, after: cursor },
        edges: { node: CANDIDATE_DEAL_SELECTION },
        pageInfo: PAGE_INFO_SELECTION,
      },
    });

    return opportunities as Connection<CandidateDeal>;
  });
};

export const findDealsWithNewActivity = async ({
  client,
  since,
  now,
  settings,
}: {
  client: CoreApiClient;
  since: string;
  now: Date;
  settings: DealCoachSettings;
}): Promise<string[]> => {
  const signalGroups = await Promise.all([
    fetchWhatsappSignals(client, since, now),
    fetchEmailSignals(client, since, now),
    fetchCallRecordingSignals(client, since),
    fetchStageChangeSignals(client, since),
  ]);
  const signals = signalGroups.flat();

  if (signals.length === 0) {
    return [];
  }

  const deals = await fetchCandidateDeals(client, signals);

  return selectDealsToRefresh({ signals, deals, settings });
};

export const findStaleOpenDeals = async ({
  client,
  now,
  settings,
}: {
  client: CoreApiClient;
  now: Date;
  settings: DealCoachSettings;
}): Promise<string[]> => {
  const staleBefore = new Date(
    now.getTime() - settings.refreshAfterDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const staleOpenDealIds: string[] = [];
  let scannedCount = 0;
  let cursor: string | undefined;
  let hasNextPage = true;

  // Closed stages are filtered here rather than in the query: they are free
  // text from an app variable, and a value the stage field does not have
  // would make the GraphQL enum filter reject the whole query.
  while (
    hasNextPage &&
    staleOpenDealIds.length < settings.maxDealsPerRun &&
    scannedCount < MAX_ROWS_PER_SOURCE
  ) {
    const { opportunities } = await executeWithRetry(() =>
      client.query({
        opportunities: {
          __args: {
            filter: {
              or: [
                { nextBestActionUpdatedAt: { is: 'NULL' } },
                { nextBestActionUpdatedAt: { lt: staleBefore } },
              ],
            },
            orderBy: [{ nextBestActionUpdatedAt: 'AscNullsFirst' }],
            first: PAGE_SIZE,
            after: cursor,
          },
          edges: { node: { id: true, stage: true } },
          pageInfo: PAGE_INFO_SELECTION,
        },
      }),
    );

    const connection = opportunities as Connection<{
      id: string;
      stage: string | null;
    }>;
    const nodes = (connection?.edges ?? []).map((edge) => edge.node);

    scannedCount += nodes.length;
    staleOpenDealIds.push(
      ...nodes
        .filter((node) => !isClosedStage(node.stage, settings))
        .map((node) => node.id),
    );

    hasNextPage = connection?.pageInfo.hasNextPage ?? false;
    cursor = connection?.pageInfo.endCursor ?? undefined;
  }

  return staleOpenDealIds.slice(0, settings.maxDealsPerRun);
};
