import { isDefined } from 'twenty-shared/utils';
import { StepStatus, type WorkflowRunStepInfos } from 'twenty-shared/workflow';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

const getEndedAtTimestamp = (endedAt: string | undefined) => {
  const timestamp = isDefined(endedAt) ? Date.parse(endedAt) : NaN;

  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
};

// With parallel branches the earliest failure is the most likely root cause
export const findFirstFailedStepId = ({
  steps,
  stepInfos,
}: {
  steps: WorkflowAction[];
  stepInfos: WorkflowRunStepInfos;
}): string | undefined => {
  const failedSteps = steps.filter(
    (step) => stepInfos[step.id]?.status === StepStatus.FAILED,
  );

  if (failedSteps.length === 0) {
    return undefined;
  }

  return failedSteps.reduce((earliestFailedStep, failedStep) =>
    getEndedAtTimestamp(stepInfos[failedStep.id]?.endedAt) <
    getEndedAtTimestamp(stepInfos[earliestFailedStep.id]?.endedAt)
      ? failedStep
      : earliestFailedStep,
  ).id;
};
