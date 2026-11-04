import { getWorkflowRunStepErrorPhaseHint } from '@/workflow/workflow-run-trace/utils/getWorkflowRunStepErrorPhaseHint';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyArray } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { type WorkflowRunStepErrorDetails } from 'twenty-shared/workflow';
import { Callout } from 'twenty-ui/feedback';
import { IconAlertTriangle, IconVariable } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding-bottom: ${themeCssVariables.spacing[3]};
`;

export const WorkflowRunStepErrorHints = ({
  errorDetails,
}: {
  errorDetails: WorkflowRunStepErrorDetails;
}) => {
  const { t } = useLingui();

  const phaseHint = getWorkflowRunStepErrorPhaseHint(errorDetails.phase);
  const emptyVariables = errorDetails.emptyVariables;
  const emptyVariablesList = emptyVariables?.join(', ');

  if (!isDefined(phaseHint) && !isNonEmptyArray(emptyVariables)) {
    return null;
  }

  return (
    <StyledContainer>
      {isDefined(phaseHint) && (
        <Callout
          variant="error"
          Icon={IconAlertTriangle}
          title={phaseHint.title}
          description={phaseHint.description}
        />
      )}
      {isNonEmptyArray(emptyVariables) && (
        <Callout
          variant="warning"
          Icon={IconVariable}
          title={t`Some variables were empty`}
          description={t`These variables had no value when the step ran: ${emptyVariablesList}. Check the trigger or the earlier step that should provide them.`}
        />
      )}
    </StyledContainer>
  );
};
