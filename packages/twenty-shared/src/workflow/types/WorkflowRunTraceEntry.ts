import { type StepStatus } from '@/workflow/types/WorkflowRunStateStepInfos';
import { type WorkflowRunStepErrorDetails } from '@/workflow/types/WorkflowRunStepErrorDetails';

export type WorkflowRunTraceEntry = {
  stepId: string;
  stepName: string;
  stepType: string;
  status: StepStatus;
  iteration?: number;
  attempt?: number;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  matchingBranchId?: string;
  error?: string;
  errorDetails?: WorkflowRunStepErrorDetails;
};
