import { isDefined } from 'twenty-shared/utils';
import { StepStatus, type WorkflowRunStepInfo } from 'twenty-shared/workflow';

const FINISHED_STEP_STATUSES = [
  StepStatus.SUCCESS,
  StepStatus.FAILED,
  StepStatus.FAILED_SAFELY,
  StepStatus.STOPPED,
  StepStatus.SKIPPED,
];

// An iterator is set to RUNNING again on every loop pass, so only the first transition marks its start
export const computeStepInfoTiming = ({
  previousStepInfo,
  nextStatus,
  now,
}: {
  previousStepInfo: WorkflowRunStepInfo | undefined;
  nextStatus: StepStatus;
  now: string;
}): Pick<WorkflowRunStepInfo, 'startedAt' | 'endedAt'> => {
  const isStarting =
    nextStatus === StepStatus.RUNNING &&
    (previousStepInfo?.status !== StepStatus.RUNNING ||
      !isDefined(previousStepInfo.startedAt));

  return {
    startedAt: isStarting ? now : previousStepInfo?.startedAt,
    endedAt: FINISHED_STEP_STATUSES.includes(nextStatus) ? now : undefined,
  };
};
