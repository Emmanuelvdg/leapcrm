import { WorkflowRunTraceStatusIcon } from '@/workflow/workflow-run-trace/components/WorkflowRunTraceStatusIcon';
import { getWorkflowRunStepErrorPhaseHint } from '@/workflow/workflow-run-trace/utils/getWorkflowRunStepErrorPhaseHint';
import { getWorkflowRunTraceStepStatusLabel } from '@/workflow/workflow-run-trace/utils/getWorkflowRunTraceStepStatusLabel';
import { formatDuration } from '@/workflow/workflow-steps/workflow-actions/utils/formatDuration';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyArray } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { type WorkflowRunTraceEntry } from 'twenty-shared/workflow';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledRow = styled.button`
  align-items: flex-start;
  background: none;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
  text-align: left;
  width: 100%;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledPosition = styled.span`
  color: ${themeCssVariables.font.color.light};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.sm};
  min-width: ${themeCssVariables.spacing[4]};
`;

const StyledBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledTitleRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledTitleLeft = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledStepName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledDuration = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledMeta = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledError = styled.div`
  color: ${themeCssVariables.color.red};
  font-size: ${themeCssVariables.font.size.sm};
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

const StyledHint = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  overflow-wrap: anywhere;
`;

const formatStartTime = (startedAt: string) => {
  const date = new Date(startedAt);

  return Number.isNaN(date.getTime()) ? startedAt : date.toLocaleTimeString();
};

export const WorkflowRunTraceEntryRow = ({
  entry,
  position,
  onClick,
}: {
  entry: WorkflowRunTraceEntry;
  position: number;
  onClick: () => void;
}) => {
  const { t } = useLingui();

  const errorMessage = entry.errorDetails?.message ?? entry.error;
  const emptyVariables = entry.errorDetails?.emptyVariables;
  const phaseHint = isDefined(entry.errorDetails)
    ? getWorkflowRunStepErrorPhaseHint(entry.errorDetails.phase)
    : undefined;

  const itemNumber = isDefined(entry.iteration)
    ? entry.iteration + 1
    : undefined;
  const attempt = entry.attempt;
  const emptyVariablesList = emptyVariables?.join(', ');

  const metaParts = [
    getWorkflowRunTraceStepStatusLabel(entry.status),
    ...(isDefined(itemNumber) ? [t`Item ${itemNumber}`] : []),
    ...(isDefined(attempt) && attempt > 1 ? [t`Attempt ${attempt}`] : []),
    ...(isDefined(entry.startedAt) ? [formatStartTime(entry.startedAt)] : []),
  ];

  return (
    <StyledRow type="button" onClick={onClick}>
      <StyledPosition>{position}</StyledPosition>
      <StyledBody>
        <StyledTitleRow>
          <StyledTitleLeft>
            <WorkflowRunTraceStatusIcon status={entry.status} />
            <StyledStepName>{entry.stepName}</StyledStepName>
          </StyledTitleLeft>
          {isDefined(entry.durationMs) && (
            <StyledDuration>{formatDuration(entry.durationMs)}</StyledDuration>
          )}
        </StyledTitleRow>
        <StyledMeta>{metaParts.join(' · ')}</StyledMeta>
        {isDefined(errorMessage) && <StyledError>{errorMessage}</StyledError>}
        {isDefined(phaseHint) && <StyledHint>{phaseHint.title}</StyledHint>}
        {isNonEmptyArray(emptyVariables) && (
          <StyledHint>{t`Empty variables: ${emptyVariablesList}`}</StyledHint>
        )}
      </StyledBody>
    </StyledRow>
  );
};
