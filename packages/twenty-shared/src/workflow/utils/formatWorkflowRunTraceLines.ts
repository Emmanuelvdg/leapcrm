import { isDefined } from '@/utils';
import { type WorkflowRunTraceEntry } from '@/workflow/types/WorkflowRunTraceEntry';

type WorkflowRunTraceHeader = {
  id: string;
  name?: string | null;
  status: string;
  startedAt?: string | null;
  endedAt?: string | null;
  error?: string | null;
  failedStepId?: string | null;
};

const formatTraceEntry = (
  entry: WorkflowRunTraceEntry,
  position: number,
): string[] => {
  const iterationLabel = isDefined(entry.iteration)
    ? ` [iteration ${entry.iteration}]`
    : '';
  const attemptLabel =
    isDefined(entry.attempt) && entry.attempt > 1
      ? ` [attempt ${entry.attempt}]`
      : '';
  const durationLabel = isDefined(entry.durationMs)
    ? `${entry.durationMs}ms`
    : '-';
  const branchLabel = isDefined(entry.matchingBranchId)
    ? ` -> branch ${entry.matchingBranchId}`
    : '';

  const lines = [
    `${position}. ${entry.status.padEnd(13)} ${entry.startedAt ?? '-'}  ${durationLabel.padStart(8)}  "${entry.stepName}" (${entry.stepType}) ${entry.stepId}${iterationLabel}${attemptLabel}${branchLabel}`,
  ];

  const errorDetails = entry.errorDetails;

  if (!isDefined(errorDetails)) {
    if (isDefined(entry.error)) {
      lines.push(`     error: ${entry.error}`);
    }

    return lines;
  }

  lines.push(`     error: ${errorDetails.message}`);
  lines.push(
    `     phase: ${errorDetails.phase}  system error: ${errorDetails.isSystemError}${
      isDefined(errorDetails.type) ? `  type: ${errorDetails.type}` : ''
    }${isDefined(errorDetails.code) ? `  code: ${errorDetails.code}` : ''}`,
  );

  if (isDefined(errorDetails.emptyVariables)) {
    lines.push(
      `     empty variables: ${errorDetails.emptyVariables.join(', ')}`,
    );
  }

  if (isDefined(errorDetails.resolvedInput)) {
    lines.push(
      `     input${errorDetails.resolvedInputTruncated ? ' (truncated)' : ''}: ${
        typeof errorDetails.resolvedInput === 'string'
          ? errorDetails.resolvedInput
          : JSON.stringify(errorDetails.resolvedInput)
      }`,
    );
  }

  if (isDefined(errorDetails.stack)) {
    lines.push(`     stack: ${errorDetails.stack}`);
  }

  return lines;
};

export const formatWorkflowRunTraceLines = ({
  workflowRun,
  trace,
}: {
  workflowRun: WorkflowRunTraceHeader;
  trace: WorkflowRunTraceEntry[];
}): string[] => {
  const failedStepName = trace.find(
    (entry) => entry.stepId === workflowRun.failedStepId,
  )?.stepName;

  return [
    `Workflow run ${workflowRun.name ?? ''} (${workflowRun.id})`,
    `Status: ${workflowRun.status}  started: ${workflowRun.startedAt ?? '-'}  ended: ${workflowRun.endedAt ?? '-'}`,
    ...(isDefined(workflowRun.error) ? [`Error: ${workflowRun.error}`] : []),
    ...(isDefined(workflowRun.failedStepId)
      ? [
          `Failed step: ${isDefined(failedStepName) ? `"${failedStepName}" ` : ''}${workflowRun.failedStepId}`,
        ]
      : []),
    '',
    ...trace.flatMap((entry, index) => formatTraceEntry(entry, index + 1)),
  ];
};
