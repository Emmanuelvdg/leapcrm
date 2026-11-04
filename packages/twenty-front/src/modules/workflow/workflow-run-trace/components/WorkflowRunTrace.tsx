import { useWorkflowRun } from '@/workflow/hooks/useWorkflowRun';
import { getWorkflowRunStatusTagProps } from '@/workflow/workflow-diagram/utils/getWorkflowRunStatusTagProps';
import { WorkflowRunTraceEntryRow } from '@/workflow/workflow-run-trace/components/WorkflowRunTraceEntryRow';
import { useOpenWorkflowRunStepInSidePanel } from '@/workflow/workflow-steps/hooks/useOpenWorkflowRunStepInSidePanel';
import {
  StyledBodyMeta,
  StyledEmptyHint,
  StyledErrorCard,
  StyledErrorMessageText,
  StyledHeaderLeft,
  StyledSection,
  StyledSectionTitle,
  StyledSummaryHeader,
} from '@/workflow/workflow-steps/workflow-actions/components/workflowRunStepLogsStyles';
import { formatDuration } from '@/workflow/workflow-steps/workflow-actions/utils/formatDuration';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import {
  buildWorkflowRunTrace,
  formatWorkflowRunTraceLines,
} from 'twenty-shared/workflow';
import { Tag } from 'twenty-ui/data-display';
import { IconCopy } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledEntryList = styled.div`
  display: flex;
  flex-direction: column;
`;

const computeRunDurationMs = (
  startedAt: string | undefined,
  endedAt: string | null,
) => {
  if (!isDefined(startedAt) || !isDefined(endedAt)) {
    return undefined;
  }

  const durationMs = Date.parse(endedAt) - Date.parse(startedAt);

  return Number.isNaN(durationMs) ? undefined : durationMs;
};

export const WorkflowRunTrace = ({
  workflowRunId,
}: {
  workflowRunId: string;
}) => {
  const { t } = useLingui();
  const { copyToClipboard } = useCopyToClipboard();
  const { openWorkflowRunStepInSidePanel } =
    useOpenWorkflowRunStepInSidePanel();

  const workflowRun = useWorkflowRun({ workflowRunId });

  if (!isDefined(workflowRun?.state)) {
    return null;
  }

  const workflowRunState = workflowRun.state;

  const trace = buildWorkflowRunTrace({
    steps: workflowRunState.flow.steps,
    stepInfos: workflowRunState.stepInfos,
  });

  const runStartedAt = isNonEmptyString(workflowRun.startedAt)
    ? workflowRun.startedAt
    : undefined;
  const runError = isNonEmptyString(workflowRunState.workflowRunError)
    ? workflowRunState.workflowRunError
    : undefined;
  const runDurationMs = computeRunDurationMs(runStartedAt, workflowRun.endedAt);
  const statusTagProps = getWorkflowRunStatusTagProps({
    workflowRunStatus: workflowRun.status,
  });

  const handleCopyTrace = () => {
    const traceLines = formatWorkflowRunTraceLines({
      workflowRun: {
        id: workflowRun.id,
        name: workflowRun.name,
        status: workflowRun.status,
        startedAt: runStartedAt,
        endedAt: workflowRun.endedAt,
        error: runError,
        failedStepId: workflowRunState.failedStepId,
      },
      trace,
    });

    copyToClipboard(traceLines.join('\n'), t`Trace copied to clipboard`);
  };

  return (
    <StyledContainer>
      <StyledSummaryHeader>
        <StyledHeaderLeft>
          <Tag color={statusTagProps.color} text={statusTagProps.text} />
          {isDefined(runDurationMs) && (
            <StyledBodyMeta>{formatDuration(runDurationMs)}</StyledBodyMeta>
          )}
        </StyledHeaderLeft>
        <Button
          Icon={IconCopy}
          title={t`Copy trace`}
          size="small"
          variant="secondary"
          onClick={handleCopyTrace}
        />
      </StyledSummaryHeader>

      {isDefined(runError) && (
        <StyledErrorCard>
          <StyledErrorMessageText>{runError}</StyledErrorMessageText>
        </StyledErrorCard>
      )}

      <StyledSection>
        <StyledSectionTitle>{t`Steps in execution order`}</StyledSectionTitle>
        {trace.length === 0 ? (
          <StyledEmptyHint>{t`No step has run yet`}</StyledEmptyHint>
        ) : (
          <StyledEntryList>
            {trace.map((entry, index) => (
              <WorkflowRunTraceEntryRow
                key={`${entry.stepId}-${entry.iteration ?? 'single'}`}
                entry={entry}
                position={index + 1}
                onClick={() =>
                  openWorkflowRunStepInSidePanel({
                    workflowRun,
                    stepId: entry.stepId,
                    iteration: entry.iteration,
                  })
                }
              />
            ))}
          </StyledEntryList>
        )}
      </StyledSection>
    </StyledContainer>
  );
};
