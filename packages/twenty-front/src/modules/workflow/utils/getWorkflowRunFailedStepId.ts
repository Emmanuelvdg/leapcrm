import { type WorkflowRunState } from '@/workflow/types/Workflow';
import { StepStatus } from 'twenty-shared/workflow';

// Runs that failed before failedStepId was recorded only carry step statuses
export const getWorkflowRunFailedStepId = (
  workflowRunState: WorkflowRunState | null,
): string | undefined =>
  workflowRunState?.failedStepId ??
  workflowRunState?.flow.steps.find(
    (step) => workflowRunState.stepInfos[step.id]?.status === StepStatus.FAILED,
  )?.id;
