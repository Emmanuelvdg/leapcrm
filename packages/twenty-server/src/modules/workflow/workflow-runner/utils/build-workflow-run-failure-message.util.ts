import { type WorkflowRunStepErrorPhase } from 'twenty-shared/workflow';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const buildWorkflowRunFailureMessage = ({
  step,
  errorMessage,
  phase,
}: {
  step: Pick<WorkflowAction, 'name' | 'type'>;
  errorMessage: string;
  phase: WorkflowRunStepErrorPhase;
}): string => {
  const stepLabel = `"${step.name}" (${step.type})`;

  switch (phase) {
    case 'PREFLIGHT':
      return `Step ${stepLabel} could not be prepared: ${errorMessage}`;
    case 'ORCHESTRATION':
      return `Workflow engine error at step ${stepLabel}: ${errorMessage}`;
    case 'EXECUTE':
      return `Step ${stepLabel} failed: ${errorMessage}`;
  }
};
