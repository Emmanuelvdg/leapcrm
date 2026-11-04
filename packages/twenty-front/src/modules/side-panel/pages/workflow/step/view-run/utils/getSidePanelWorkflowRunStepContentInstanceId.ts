export const getSidePanelWorkflowRunStepContentInstanceId = ({
  workflowRunId,
  stepId,
}: {
  workflowRunId: string;
  stepId: string;
}) => `${workflowRunId}_${stepId}`;
