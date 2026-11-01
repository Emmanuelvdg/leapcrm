import { isDefined } from '@/utils';
import { WorkflowActionType } from '@/workflow/types/WorkflowActionType';
import {
  StepStatus,
  type WorkflowRunStepInfo,
  type WorkflowRunStepInfos,
} from '@/workflow/types/WorkflowRunStateStepInfos';
import { type WorkflowRunTraceEntry } from '@/workflow/types/WorkflowRunTraceEntry';

type WorkflowRunTraceStep = {
  id: string;
  name: string;
  type: string;
};

type WorkflowRunStepExecution = Pick<
  WorkflowRunStepInfo,
  'status' | 'result' | 'error' | 'startedAt' | 'endedAt' | 'errorDetails'
>;

const computeDurationMs = (
  startedAt: string | undefined,
  endedAt: string | undefined,
): number | undefined => {
  if (!isDefined(startedAt) || !isDefined(endedAt)) {
    return undefined;
  }

  const durationMs = Date.parse(endedAt) - Date.parse(startedAt);

  return Number.isNaN(durationMs) ? undefined : durationMs;
};

const getMatchingBranchId = (
  step: WorkflowRunTraceStep,
  result: unknown,
): string | undefined => {
  if (step.type !== WorkflowActionType.IF_ELSE) {
    return undefined;
  }

  const matchingBranchId = (result as { matchingBranchId?: unknown })
    ?.matchingBranchId;

  return typeof matchingBranchId === 'string' ? matchingBranchId : undefined;
};

const toTraceEntry = ({
  step,
  execution,
  iteration,
  attempt,
}: {
  step: WorkflowRunTraceStep;
  execution: WorkflowRunStepExecution;
  iteration?: number;
  attempt?: number;
}): WorkflowRunTraceEntry => ({
  stepId: step.id,
  stepName: step.name,
  stepType: step.type,
  status: execution.status,
  iteration,
  attempt,
  startedAt: execution.startedAt,
  endedAt: execution.endedAt,
  durationMs: computeDurationMs(execution.startedAt, execution.endedAt),
  matchingBranchId: getMatchingBranchId(step, execution.result),
  error: typeof execution.error === 'string' ? execution.error : undefined,
  errorDetails: execution.errorDetails,
});

const buildStepTraceEntries = (
  step: WorkflowRunTraceStep,
  stepInfo: WorkflowRunStepInfo | undefined,
): WorkflowRunTraceEntry[] => {
  if (!isDefined(stepInfo)) {
    return [];
  }

  const history = stepInfo.history ?? [];

  // Iterator history holds one entry per processed item, not per execution
  if (step.type === WorkflowActionType.ITERATOR || history.length === 0) {
    return [
      toTraceEntry({ step, execution: stepInfo, attempt: stepInfo.attempt }),
    ];
  }

  const iterationEntries = history.map((execution, iteration) =>
    toTraceEntry({ step, execution, iteration }),
  );

  // A loop step reset for the next iteration that never ran again is a placeholder
  if (stepInfo.status === StepStatus.NOT_STARTED) {
    return iterationEntries;
  }

  return [
    ...iterationEntries,
    toTraceEntry({
      step,
      execution: stepInfo,
      iteration: history.length,
      attempt: stepInfo.attempt,
    }),
  ];
};

const getSortTimestamp = (entry: WorkflowRunTraceEntry): number | undefined => {
  const timestamp = entry.startedAt ?? entry.endedAt;

  if (!isDefined(timestamp)) {
    return undefined;
  }

  const parsedTimestamp = Date.parse(timestamp);

  return Number.isNaN(parsedTimestamp) ? undefined : parsedTimestamp;
};

export const buildWorkflowRunTrace = ({
  steps,
  stepInfos,
}: {
  steps: WorkflowRunTraceStep[];
  stepInfos: WorkflowRunStepInfos;
}): WorkflowRunTraceEntry[] => {
  const entriesInFlowOrder = steps.flatMap((step) =>
    buildStepTraceEntries(step, stepInfos[step.id]),
  );

  return entriesInFlowOrder
    .map((entry, flowIndex) => ({
      entry,
      flowIndex,
      timestamp: getSortTimestamp(entry),
    }))
    .sort((left, right) => {
      if (isDefined(left.timestamp) && isDefined(right.timestamp)) {
        return (
          left.timestamp - right.timestamp || left.flowIndex - right.flowIndex
        );
      }

      if (isDefined(left.timestamp)) {
        return -1;
      }

      if (isDefined(right.timestamp)) {
        return 1;
      }

      return left.flowIndex - right.flowIndex;
    })
    .map(({ entry }) => entry);
};
