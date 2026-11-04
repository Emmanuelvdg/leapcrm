import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useWorkflowRun } from '@/workflow/hooks/useWorkflowRun';
import { WorkflowRunDiagramCanvas } from '@/workflow/workflow-diagram/components/WorkflowRunDiagramCanvas';
import { WorkflowRunFailureBanner } from '@/workflow/workflow-diagram/components/WorkflowRunFailureBanner';
import { workflowDiagramStatusComponentState } from '@/workflow/workflow-diagram/states/workflowDiagramStatusComponentState';
import { styled } from '@linaria/react';
import { isDefined } from 'twenty-shared/utils';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
`;

const StyledDiagramContainer = styled.div`
  flex: 1;
  min-height: 0;
`;

export const WorkflowRunVisualizer = ({
  workflowRunId,
}: {
  workflowRunId: string;
}) => {
  const workflowRun = useWorkflowRun({ workflowRunId });
  const workflowDiagramStatus = useAtomComponentStateValue(
    workflowDiagramStatusComponentState,
  );

  if (
    !isDefined(workflowRun) ||
    workflowDiagramStatus === 'computing-diagram'
  ) {
    return null;
  }

  return (
    <StyledContainer>
      <WorkflowRunFailureBanner workflowRun={workflowRun} />
      <StyledDiagramContainer>
        <WorkflowRunDiagramCanvas workflowRunStatus={workflowRun.status} />
      </StyledDiagramContainer>
    </StyledContainer>
  );
};
