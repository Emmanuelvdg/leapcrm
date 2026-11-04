import { useSidePanelWorkflowRunIdOrThrow } from '@/side-panel/pages/workflow/step/view-run/hooks/useSidePanelWorkflowRunIdOrThrow';
import { WorkflowRunTrace } from '@/workflow/workflow-run-trace/components/WorkflowRunTrace';

export const SidePanelWorkflowRunTrace = () => {
  const workflowRunId = useSidePanelWorkflowRunIdOrThrow();

  return <WorkflowRunTrace workflowRunId={workflowRunId} />;
};
