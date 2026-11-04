import { StepStatus } from '@/workflow/types/WorkflowRunStateStepInfos';
import { formatWorkflowRunTraceLines } from '@/workflow/utils/formatWorkflowRunTraceLines';

describe('formatWorkflowRunTraceLines', () => {
  it('prints the run header, the failed step name and each entry with its error details', () => {
    const lines = formatWorkflowRunTraceLines({
      workflowRun: {
        id: 'run-1',
        name: 'Run #1',
        status: 'FAILED',
        startedAt: '2026-11-01T10:00:00.000Z',
        endedAt: '2026-11-01T10:00:03.000Z',
        error:
          'Step "Update company" (UPDATE_RECORD) failed: Invalid field value',
        failedStepId: 'update',
      },
      trace: [
        {
          stepId: 'find',
          stepName: 'Find people',
          stepType: 'FIND_RECORDS',
          status: StepStatus.SUCCESS,
          startedAt: '2026-11-01T10:00:01.000Z',
          durationMs: 100,
        },
        {
          stepId: 'update',
          stepName: 'Update company',
          stepType: 'UPDATE_RECORD',
          status: StepStatus.FAILED,
          iteration: 2,
          attempt: 2,
          startedAt: '2026-11-01T10:00:02.000Z',
          durationMs: 250,
          errorDetails: {
            message: 'Invalid field value',
            phase: 'EXECUTE',
            isSystemError: false,
            emptyVariables: ['{{trigger.object.email}}'],
            resolvedInput: { email: '' },
          },
        },
      ],
    });

    expect(lines).toEqual([
      'Workflow run Run #1 (run-1)',
      'Status: FAILED  started: 2026-11-01T10:00:00.000Z  ended: 2026-11-01T10:00:03.000Z',
      'Error: Step "Update company" (UPDATE_RECORD) failed: Invalid field value',
      'Failed step: "Update company" update',
      '',
      '1. SUCCESS       2026-11-01T10:00:01.000Z     100ms  "Find people" (FIND_RECORDS) find',
      '2. FAILED        2026-11-01T10:00:02.000Z     250ms  "Update company" (UPDATE_RECORD) update [iteration 2] [attempt 2]',
      '     error: Invalid field value',
      '     phase: EXECUTE  system error: false',
      '     empty variables: {{trigger.object.email}}',
      '     input: {"email":""}',
    ]);
  });

  it('falls back to the plain error and skips missing header fields', () => {
    const lines = formatWorkflowRunTraceLines({
      workflowRun: { id: 'run-2', status: 'COMPLETED' },
      trace: [
        {
          stepId: 'code',
          stepName: 'Code',
          stepType: 'CODE',
          status: StepStatus.FAILED_SAFELY,
          error: 'Timeout',
        },
      ],
    });

    expect(lines).toEqual([
      'Workflow run  (run-2)',
      'Status: COMPLETED  started: -  ended: -',
      '',
      '1. FAILED_SAFELY -         -  "Code" (CODE) code',
      '     error: Timeout',
    ]);
  });
});
