import { type WorkflowRunStepErrorDetails } from 'twenty-shared/workflow';

export type WorkflowActionOutput = {
  result?: object;
  error?: string;
  errorDetails?: WorkflowRunStepErrorDetails;
  pendingEvent?: boolean;
  shouldEndWorkflowRun?: boolean;
  shouldRemainRunning?: boolean;
  shouldSkipStepExecution?: boolean;
  shouldFailSafely?: boolean;
};
