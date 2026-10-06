import { type CoreApiClient } from 'twenty-client-sdk/core';

import {
  computeDealHealth,
  type DealHealthSettings,
} from 'src/utils/compute-deal-health';
import { executeWithRetry } from 'src/utils/execute-with-retry';

const QUERY_MAX_RECORDS = 100;
const DONE_TASK_STATUS = 'DONE';

export type OpportunityNode = {
  id: string;
  stage: string | null;
  closeDate: string | null;
  updatedAt: string;
  stageChangedAt: string | null;
  healthStatus: string | null;
  healthReasons: string | null;
};

export const OPPORTUNITY_NODE_SELECTION = {
  id: true,
  stage: true,
  closeDate: true,
  updatedAt: true,
  stageChangedAt: true,
  healthStatus: true,
  healthReasons: true,
} as const;

type TaskTargetNode = {
  targetOpportunityId: string | null;
  task: { status: string | null } | null;
};

const fetchOpenTaskCountByOpportunityId = async (
  client: CoreApiClient,
  opportunityIds: string[],
): Promise<Map<string, number>> => {
  const openTaskCountByOpportunityId = new Map<string, number>();
  let cursor: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const { taskTargets } = await executeWithRetry(() =>
      client.query({
        taskTargets: {
          __args: {
            filter: { targetOpportunityId: { in: opportunityIds } },
            first: QUERY_MAX_RECORDS,
            after: cursor,
          },
          edges: {
            node: { targetOpportunityId: true, task: { status: true } },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      }),
    );

    for (const { node } of (taskTargets?.edges ?? []) as {
      node: TaskTargetNode;
    }[]) {
      if (!node.targetOpportunityId || node.task?.status === DONE_TASK_STATUS) {
        continue;
      }

      openTaskCountByOpportunityId.set(
        node.targetOpportunityId,
        (openTaskCountByOpportunityId.get(node.targetOpportunityId) ?? 0) + 1,
      );
    }

    hasNextPage = taskTargets?.pageInfo.hasNextPage ?? false;
    cursor = taskTargets?.pageInfo.endCursor ?? undefined;
  }

  return openTaskCountByOpportunityId;
};

// Deals that predate the app have no stage history, so the last update is the
// closest available stand-in for when they entered their current stage.
const resolveStageChangedAt = (
  opportunity: OpportunityNode,
  stageChangedAtOverride: string | undefined,
): string =>
  stageChangedAtOverride ?? opportunity.stageChangedAt ?? opportunity.updatedAt;

export const scoreOpportunities = async ({
  client,
  opportunities,
  settings,
  now,
  stageChangedAtOverride,
}: {
  client: CoreApiClient;
  opportunities: OpportunityNode[];
  settings: DealHealthSettings;
  now: Date;
  stageChangedAtOverride?: string;
}): Promise<number> => {
  if (opportunities.length === 0) {
    return 0;
  }

  const openTaskCountByOpportunityId = await fetchOpenTaskCountByOpportunityId(
    client,
    opportunities.map((opportunity) => opportunity.id),
  );

  let updatedCount = 0;

  for (const opportunity of opportunities) {
    const stageChangedAt = resolveStageChangedAt(
      opportunity,
      stageChangedAtOverride,
    );

    const { healthStatus, healthReasons } = computeDealHealth(
      {
        stage: opportunity.stage,
        closeDate: opportunity.closeDate,
        stageChangedAt,
        openTaskCount: openTaskCountByOpportunityId.get(opportunity.id) ?? 0,
      },
      settings,
      now,
    );

    // Writing only on change keeps the deal timeline free of no-op updates.
    // The API returns an empty string for text stored as null.
    if (
      stageChangedAt === opportunity.stageChangedAt &&
      healthStatus === opportunity.healthStatus &&
      healthReasons === (opportunity.healthReasons || null)
    ) {
      continue;
    }

    await executeWithRetry(() =>
      client.mutation({
        updateOpportunity: {
          __args: {
            id: opportunity.id,
            data: { stageChangedAt, healthStatus, healthReasons },
          },
          id: true,
        },
      }),
    );

    updatedCount += 1;
  }

  return updatedCount;
};

export const scoreOpportunityById = async ({
  client,
  opportunityId,
  settings,
  now,
  stageChangedAtOverride,
}: {
  client: CoreApiClient;
  opportunityId: string;
  settings: DealHealthSettings;
  now: Date;
  stageChangedAtOverride?: string;
}): Promise<number> => {
  const { opportunity } = await executeWithRetry(() =>
    client.query({
      opportunity: {
        __args: { filter: { id: { eq: opportunityId } } },
        ...OPPORTUNITY_NODE_SELECTION,
      },
    }),
  );

  if (!opportunity) {
    return 0;
  }

  return scoreOpportunities({
    client,
    opportunities: [opportunity as OpportunityNode],
    settings,
    now,
    stageChangedAtOverride,
  });
};

export const scoreAllOpportunities = async ({
  client,
  settings,
  now,
}: {
  client: CoreApiClient;
  settings: DealHealthSettings;
  now: Date;
}): Promise<{ scannedCount: number; updatedCount: number }> => {
  let scannedCount = 0;
  let updatedCount = 0;
  let cursor: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const { opportunities } = await executeWithRetry(() =>
      client.query({
        opportunities: {
          __args: { first: QUERY_MAX_RECORDS, after: cursor },
          edges: { node: OPPORTUNITY_NODE_SELECTION },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      }),
    );

    const nodes = ((opportunities?.edges ?? []) as { node: OpportunityNode }[])
      .map((edge) => edge.node);

    scannedCount += nodes.length;
    updatedCount += await scoreOpportunities({
      client,
      opportunities: nodes,
      settings,
      now,
    });

    hasNextPage = opportunities?.pageInfo.hasNextPage ?? false;
    cursor = opportunities?.pageInfo.endCursor ?? undefined;
  }

  return { scannedCount, updatedCount };
};
