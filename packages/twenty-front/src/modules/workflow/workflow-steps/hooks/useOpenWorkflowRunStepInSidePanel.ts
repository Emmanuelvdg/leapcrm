import { useSidePanelWorkflowNavigation } from '@/side-panel/pages/workflow/hooks/useSidePanelWorkflowNavigation';
import { workflowRunIteratorSubStepIterationIndexComponentState } from '@/side-panel/pages/workflow/step/view-run/states/workflowRunIteratorSubStepIterationIndexComponentState';
import { getSidePanelWorkflowRunStepContentInstanceId } from '@/side-panel/pages/workflow/step/view-run/utils/getSidePanelWorkflowRunStepContentInstanceId';
import { type WorkflowRun } from '@/workflow/types/Workflow';
import { getWorkflowRunStepExecutionStatus } from '@/workflow/workflow-steps/utils/getWorkflowRunStepExecutionStatus';
import { getActionIcon } from '@/workflow/workflow-steps/workflow-actions/utils/getActionIcon';
import { useStore } from 'jotai';
import { useCallback } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { useIcons } from 'twenty-ui/icon';

export const useOpenWorkflowRunStepInSidePanel = () => {
  const store = useStore();
  const { getIcon } = useIcons();
  const { openWorkflowRunViewStepInSidePanel } =
    useSidePanelWorkflowNavigation();

  const openWorkflowRunStepInSidePanel = useCallback(
    ({
      workflowRun,
      stepId,
      iteration,
    }: {
      workflowRun: WorkflowRun;
      stepId: string;
      iteration?: number;
    }) => {
      const step = workflowRun.state?.flow.steps.find(
        (flowStep) => flowStep.id === stepId,
      );

      if (!isDefined(step)) {
        return;
      }

      if (isDefined(iteration)) {
        store.set(
          workflowRunIteratorSubStepIterationIndexComponentState.atomFamily({
            instanceId: getSidePanelWorkflowRunStepContentInstanceId({
              workflowRunId: workflowRun.id,
              stepId,
            }),
          }),
          iteration,
        );
      }

      openWorkflowRunViewStepInSidePanel({
        workflowId: workflowRun.workflowId,
        workflowRunId: workflowRun.id,
        title: step.name,
        icon: getIcon(getActionIcon(step.type)),
        workflowSelectedNode: stepId,
        stepExecutionStatus: getWorkflowRunStepExecutionStatus({
          workflowRunState: workflowRun.state,
          stepId,
        }),
      });
    },
    [getIcon, openWorkflowRunViewStepInSidePanel, store],
  );

  return { openWorkflowRunStepInSidePanel };
};
