import { CommandMenuContext } from '@/command-menu-item/contexts/CommandMenuContext';
import { sidePanelNavigationStackState } from '@/side-panel/states/sidePanelNavigationStackState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { type WorkflowRun } from '@/workflow/types/Workflow';
import { getWorkflowRunFailedStepId } from '@/workflow/utils/getWorkflowRunFailedStepId';
import { useOpenWorkflowRunStepInSidePanel } from '@/workflow/workflow-steps/hooks/useOpenWorkflowRunStepInSidePanel';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useContext } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconAlertTriangle } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledBanner = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.danger};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  color: ${themeCssVariables.color.red};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
  width: 100%;
`;

const StyledText = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing['0.5']};
  min-width: 0;
`;

const StyledTitle = styled.span`
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledMessage = styled.span`
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: ${themeCssVariables.font.color.secondary};
  display: -webkit-box;
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
  overflow-wrap: break-word;
`;

const StyledIconContainer = styled.div`
  display: flex;
  flex-shrink: 0;
`;

const StyledButtonContainer = styled.div`
  flex-shrink: 0;
`;

export const WorkflowRunFailureBanner = ({
  workflowRun,
}: {
  workflowRun: WorkflowRun;
}) => {
  const { t } = useLingui();
  const { openWorkflowRunStepInSidePanel } =
    useOpenWorkflowRunStepInSidePanel();
  const { commandMenuContextApi } = useContext(CommandMenuContext);
  const setSidePanelNavigationStack = useSetAtomState(
    sidePanelNavigationStackState,
  );

  if (workflowRun.status !== 'FAILED') {
    return null;
  }

  const failedStepId = getWorkflowRunFailedStepId(workflowRun.state);
  const failedStep = workflowRun.state?.flow.steps.find(
    (step) => step.id === failedStepId,
  );
  const failedStepInfo = isDefined(failedStepId)
    ? workflowRun.state?.stepInfos[failedStepId]
    : undefined;

  const failedStepError = isNonEmptyString(failedStepInfo?.error)
    ? failedStepInfo.error
    : undefined;
  const runError = isNonEmptyString(workflowRun.state?.workflowRunError)
    ? workflowRun.state.workflowRunError
    : undefined;
  const message =
    failedStepInfo?.errorDetails?.message ?? failedStepError ?? runError;

  const failedStepName = failedStep?.name;
  const title = isDefined(failedStepName)
    ? t`Failed at step "${failedStepName}"`
    : t`This run failed`;

  const handleOpenStep = () => {
    if (!isDefined(failedStep)) {
      return;
    }

    if (!commandMenuContextApi.isInSidePanel) {
      setSidePanelNavigationStack([]);
    }

    openWorkflowRunStepInSidePanel({ workflowRun, stepId: failedStep.id });
  };

  return (
    <StyledBanner>
      <StyledIconContainer>
        <IconAlertTriangle size={16} />
      </StyledIconContainer>
      <StyledText>
        <StyledTitle title={title}>{title}</StyledTitle>
        {isDefined(message) && (
          <StyledMessage title={message}>{message}</StyledMessage>
        )}
      </StyledText>
      {isDefined(failedStep) && (
        <StyledButtonContainer>
          <Button
            title={t`Open step`}
            size="small"
            variant="secondary"
            accent="danger"
            onClick={handleOpenStep}
          />
        </StyledButtonContainer>
      )}
    </StyledBanner>
  );
};
