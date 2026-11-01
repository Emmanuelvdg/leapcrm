import { isDefined } from 'twenty-shared/utils';
import { StepStatus, type WorkflowRunStepInfo } from 'twenty-shared/workflow';

import { type WorkflowIteratorResult } from 'src/modules/workflow/workflow-executor/workflow-actions/iterator/types/workflow-iterator-result.type';
import { getAllStepIdsInLoop } from 'src/modules/workflow/workflow-executor/workflow-actions/iterator/utils/get-all-step-ids-in-loop.util';
import { getIteratorInitialLoopStepIds } from 'src/modules/workflow/workflow-executor/workflow-actions/iterator/utils/get-iterator-initial-loop-step-ids.util';
import {
  type WorkflowAction,
  type WorkflowIteratorAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

type BuildRetryIteratorStepInfosResult = {
  stepInfosToUpdate: Record<string, WorkflowRunStepInfo>;
  stepIdsToRetry: string[];
};

export const buildRetryIteratorStepInfos = ({
  iteratorStep,
  iteratorStepInfo,
  steps,
}: {
  iteratorStep: WorkflowIteratorAction;
  iteratorStepInfo: WorkflowRunStepInfo;
  steps: WorkflowAction[];
}): BuildRetryIteratorStepInfosResult => {
  const iteratorResult = iteratorStepInfo.result as
    | WorkflowIteratorResult
    | undefined;

  const failedMidLoop =
    isDefined(iteratorResult) && iteratorResult.hasProcessedAllItems === false;

  const attempt = (iteratorStepInfo.attempt ?? 1) + 1;

  if (failedMidLoop) {
    return {
      stepInfosToUpdate: {
        [iteratorStep.id]: {
          ...iteratorStepInfo,
          status: StepStatus.RUNNING,
          error: undefined,
          errorDetails: undefined,
          endedAt: undefined,
          attempt,
        },
      },
      stepIdsToRetry: [],
    };
  }

  const loopStepIds = getAllStepIdsInLoop({
    iteratorStepId: iteratorStep.id,
    initialLoopStepIds: getIteratorInitialLoopStepIds(iteratorStep),
    steps,
  });

  const stepInfosToUpdate: Record<string, WorkflowRunStepInfo> = {};

  for (const loopStepId of loopStepIds) {
    stepInfosToUpdate[loopStepId] = { status: StepStatus.NOT_STARTED };
  }

  stepInfosToUpdate[iteratorStep.id] = {
    status: StepStatus.NOT_STARTED,
    attempt,
  };

  return {
    stepInfosToUpdate,
    stepIdsToRetry: [iteratorStep.id],
  };
};
