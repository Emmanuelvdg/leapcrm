import { type CoreApiClient } from 'twenty-client-sdk/core';
import { runAgent } from 'twenty-sdk/logic-function';

import { DEAL_COACH_AGENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { buildDealCoachPrompt } from 'src/utils/build-deal-coach-prompt';
import { type StageOption } from 'src/utils/deal-context.type';
import { executeWithRetry } from 'src/utils/execute-with-retry';
import {
  fetchDealContext,
  fetchDealOpportunity,
} from 'src/utils/fetch-deal-context';
import { fetchStageOptions } from 'src/utils/fetch-stage-options';
import { fillSignaturePlaceholder } from 'src/utils/fill-signature-placeholder';
import {
  type DealCoachSettings,
  isClosedStage,
} from 'src/utils/get-deal-coach-settings';
import {
  type NextBestAction,
  parseNextBestAction,
} from 'src/utils/parse-next-best-action';

export type RefreshOutcome =
  | 'refreshed'
  | 'cleared'
  | 'closed'
  | 'not-found'
  | 'agent-failed';

const EMPTY_NEXT_BEST_ACTION_FIELDS = {
  nextBestAction: null,
  nextBestActionReason: null,
  nextBestActionType: null,
  nextBestActionChannel: null,
  nextBestActionDraft: null,
  nextBestActionDueDate: null,
  nextBestActionDetails: null,
  dealRisk: null,
  nextBestActionUpdatedAt: null,
};

const toOpportunityFields = (nextBestAction: NextBestAction, now: Date) => ({
  nextBestAction: nextBestAction.nextAction,
  nextBestActionReason: nextBestAction.reason,
  nextBestActionType: nextBestAction.actionType,
  nextBestActionChannel: nextBestAction.channel,
  nextBestActionDraft: nextBestAction.draftMessage,
  nextBestActionDueDate: nextBestAction.dueDate,
  nextBestActionDetails: nextBestAction.details,
  dealRisk: nextBestAction.risk,
  nextBestActionUpdatedAt: now.toISOString(),
});

const updateOpportunity = async (
  client: CoreApiClient,
  opportunityId: string,
  data: Record<string, unknown>,
): Promise<void> => {
  await executeWithRetry(() =>
    client.mutation({
      updateOpportunity: {
        __args: { id: opportunityId, data },
        id: true,
      },
    }),
  );
};

export const refreshNextBestAction = async ({
  client,
  opportunityId,
  settings,
  stageOptions,
  now,
}: {
  client: CoreApiClient;
  opportunityId: string;
  settings: DealCoachSettings;
  stageOptions: StageOption[];
  now: Date;
}): Promise<{ outcome: RefreshOutcome; error?: string }> => {
  const opportunity = await fetchDealOpportunity(client, opportunityId);

  if (!opportunity) {
    return { outcome: 'not-found' };
  }

  if (isClosedStage(opportunity.stage, settings)) {
    // A won or lost deal has no next step, and a stale one would still show on
    // the board, so its last suggestion is removed.
    if (opportunity.nextBestAction || opportunity.nextBestActionUpdatedAt) {
      await updateOpportunity(
        client,
        opportunityId,
        EMPTY_NEXT_BEST_ACTION_FIELDS,
      );

      return { outcome: 'cleared' };
    }

    return { outcome: 'closed' };
  }

  // Won and lost stages are never offered: closing a deal is the rep's call,
  // and an AI-suggested "won" would also clear the deal's suggestion.
  const openStageOptions = stageOptions.filter(
    (stageOption) => !isClosedStage(stageOption.value, settings),
  );

  const context = await fetchDealContext({
    client,
    opportunity,
    stageOptions: openStageOptions,
    now,
  });

  const agentResult = await runAgent({
    agentUniversalIdentifier: DEAL_COACH_AGENT_UNIVERSAL_IDENTIFIER,
    prompt: buildDealCoachPrompt(context),
  });

  const nextBestAction = agentResult.success
    ? parseNextBestAction(agentResult.result, {
        today: context.today,
        stageOptions: openStageOptions,
        currentStage: context.opportunity.stage,
        currentCloseDate: context.opportunity.closeDate,
        currentAmountMicros: context.opportunity.amountMicros,
      })
    : undefined;

  if (!nextBestAction) {
    return {
      outcome: 'agent-failed',
      error: agentResult.error ?? 'The agent returned no usable suggestion.',
    };
  }

  await updateOpportunity(
    client,
    opportunityId,
    toOpportunityFields(
      {
        ...nextBestAction,
        draftMessage: fillSignaturePlaceholder(
          nextBestAction.draftMessage,
          context.ownerName,
        ),
      },
      now,
    ),
  );

  return { outcome: 'refreshed' };
};

export type RefreshManyResult = {
  refreshedIds: string[];
  clearedIds: string[];
  failedIds: string[];
  skippedIds: string[];
};

export const refreshManyNextBestActions = async ({
  client,
  opportunityIds,
  settings,
  deadlineAtMs,
}: {
  client: CoreApiClient;
  opportunityIds: string[];
  settings: DealCoachSettings;
  deadlineAtMs: number;
}): Promise<RefreshManyResult> => {
  const result: RefreshManyResult = {
    refreshedIds: [],
    clearedIds: [],
    failedIds: [],
    skippedIds: [],
  };

  if (opportunityIds.length === 0) {
    return result;
  }

  const stageOptions = await fetchStageOptions();

  for (const [index, opportunityId] of opportunityIds.entries()) {
    if (Date.now() >= deadlineAtMs) {
      result.skippedIds.push(...opportunityIds.slice(index));
      break;
    }

    try {
      const { outcome, error } = await refreshNextBestAction({
        client,
        opportunityId,
        settings,
        stageOptions,
        now: new Date(),
      });

      if (outcome === 'refreshed') {
        result.refreshedIds.push(opportunityId);
      } else if (outcome === 'cleared') {
        result.clearedIds.push(opportunityId);
      } else if (outcome === 'agent-failed') {
        console.warn(`Deal coach failed on ${opportunityId}: ${error}`);
        result.failedIds.push(opportunityId);
      } else {
        result.skippedIds.push(opportunityId);
      }
    } catch (error) {
      console.warn(
        `Deal coach failed on ${opportunityId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      result.failedIds.push(opportunityId);
    }
  }

  return result;
};
