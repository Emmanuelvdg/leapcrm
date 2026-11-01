import { StepStatus } from '@/workflow/types/WorkflowRunStateStepInfos';
import { buildWorkflowRunTrace } from '@/workflow/utils/buildWorkflowRunTrace';

describe('buildWorkflowRunTrace', () => {
  it('orders executed steps by start time and computes durations', () => {
    const trace = buildWorkflowRunTrace({
      steps: [
        { id: 'update', name: 'Update company', type: 'UPDATE_RECORD' },
        { id: 'find', name: 'Find people', type: 'FIND_RECORDS' },
      ],
      stepInfos: {
        update: {
          status: StepStatus.FAILED,
          startedAt: '2026-11-01T10:00:02.000Z',
          endedAt: '2026-11-01T10:00:02.250Z',
          error: 'Invalid field value',
          errorDetails: {
            message: 'Invalid field value',
            phase: 'EXECUTE',
            isSystemError: false,
          },
        },
        find: {
          status: StepStatus.SUCCESS,
          startedAt: '2026-11-01T10:00:01.000Z',
          endedAt: '2026-11-01T10:00:01.100Z',
        },
      },
    });

    expect(trace.map((entry) => entry.stepId)).toEqual(['find', 'update']);
    expect(trace[1]).toMatchObject({
      stepName: 'Update company',
      status: StepStatus.FAILED,
      durationMs: 250,
      error: 'Invalid field value',
      errorDetails: { phase: 'EXECUTE' },
    });
  });

  it('puts steps without timestamps last, in flow order', () => {
    const trace = buildWorkflowRunTrace({
      steps: [
        { id: 'a', name: 'A', type: 'CODE' },
        { id: 'b', name: 'B', type: 'CODE' },
        { id: 'c', name: 'C', type: 'CODE' },
      ],
      stepInfos: {
        a: { status: StepStatus.NOT_STARTED },
        b: {
          status: StepStatus.SUCCESS,
          startedAt: '2026-11-01T10:00:00.000Z',
        },
        c: { status: StepStatus.SKIPPED },
      },
    });

    expect(trace.map((entry) => entry.stepId)).toEqual(['b', 'a', 'c']);
  });

  it('expands loop iterations from history and drops the reset placeholder', () => {
    const trace = buildWorkflowRunTrace({
      steps: [
        { id: 'loop', name: 'Loop', type: 'ITERATOR' },
        { id: 'inner', name: 'Inner', type: 'CREATE_RECORD' },
      ],
      stepInfos: {
        loop: {
          status: StepStatus.RUNNING,
          startedAt: '2026-11-01T10:00:00.000Z',
          history: [
            { status: StepStatus.RUNNING },
            { status: StepStatus.RUNNING },
          ],
        },
        inner: {
          status: StepStatus.NOT_STARTED,
          history: [
            {
              status: StepStatus.SUCCESS,
              startedAt: '2026-11-01T10:00:01.000Z',
            },
            {
              status: StepStatus.FAILED_SAFELY,
              startedAt: '2026-11-01T10:00:02.000Z',
              error: 'Duplicate email',
            },
          ],
        },
      },
    });

    expect(
      trace.map(({ stepId, iteration, status }) => ({
        stepId,
        iteration,
        status,
      })),
    ).toEqual([
      { stepId: 'loop', iteration: undefined, status: StepStatus.RUNNING },
      { stepId: 'inner', iteration: 0, status: StepStatus.SUCCESS },
      { stepId: 'inner', iteration: 1, status: StepStatus.FAILED_SAFELY },
    ]);
  });

  it('exposes the branch an if-else step took', () => {
    const trace = buildWorkflowRunTrace({
      steps: [{ id: 'branch', name: 'Is customer?', type: 'IF_ELSE' }],
      stepInfos: {
        branch: {
          status: StepStatus.SUCCESS,
          result: { matchingBranchId: 'else-branch' },
        },
      },
    });

    expect(trace[0].matchingBranchId).toBe('else-branch');
  });
});
