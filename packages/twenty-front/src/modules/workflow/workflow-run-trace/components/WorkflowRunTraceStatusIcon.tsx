import { styled } from '@linaria/react';
import { StepStatus } from 'twenty-shared/workflow';
import { Loader } from 'twenty-ui/feedback';
import { IconCheck, IconCircleDashed, IconX } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledColorIcon = styled.div<{ color: string }>`
  align-items: center;
  background: ${({ color }) => color};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  height: 14px;
  justify-content: center;
  width: 14px;
`;

const StyledIconContainer = styled.div`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  height: 14px;
  justify-content: center;
  width: 14px;
`;

export const WorkflowRunTraceStatusIcon = ({
  status,
}: {
  status: StepStatus;
}) => {
  switch (status) {
    case StepStatus.SUCCESS:
    case StepStatus.STOPPED:
      return (
        <StyledColorIcon color={themeCssVariables.tag.background.turquoise}>
          <IconCheck color={themeCssVariables.tag.text.turquoise} size={14} />
        </StyledColorIcon>
      );
    case StepStatus.FAILED:
    case StepStatus.FAILED_SAFELY:
      return (
        <StyledColorIcon color={themeCssVariables.tag.background.red}>
          <IconX color={themeCssVariables.tag.text.red} size={14} />
        </StyledColorIcon>
      );
    case StepStatus.RUNNING:
    case StepStatus.PENDING:
      return (
        <StyledIconContainer>
          <Loader color="yellow" />
        </StyledIconContainer>
      );
    case StepStatus.NOT_STARTED:
    case StepStatus.SKIPPED:
      return (
        <StyledIconContainer>
          <IconCircleDashed
            color={themeCssVariables.font.color.light}
            size={14}
          />
        </StyledIconContainer>
      );
  }
};
