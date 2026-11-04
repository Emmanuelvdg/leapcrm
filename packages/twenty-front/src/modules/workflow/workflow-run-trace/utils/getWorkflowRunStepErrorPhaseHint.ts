import { t } from '@lingui/core/macro';
import { type WorkflowRunStepErrorPhase } from 'twenty-shared/workflow';

export const getWorkflowRunStepErrorPhaseHint = (
  phase: WorkflowRunStepErrorPhase,
): { title: string; description: string } | undefined => {
  switch (phase) {
    case 'PREFLIGHT':
      return {
        title: t`The step never ran`,
        description: t`It failed while being prepared. Check the step settings and the data it uses.`,
      };
    case 'ORCHESTRATION':
      return {
        title: t`The workflow engine failed`,
        description: t`The error happened while the engine was handling this step, not inside the step itself. Retrying the run may work.`,
      };
    case 'EXECUTE':
      return undefined;
  }
};
