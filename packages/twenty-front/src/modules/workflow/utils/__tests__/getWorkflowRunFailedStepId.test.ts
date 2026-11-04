import { type WorkflowRunState } from '@/workflow/types/Workflow';
import { getWorkflowRunFailedStepId } from '@/workflow/utils/getWorkflowRunFailedStepId';
import { StepStatus } from 'twenty-shared/workflow';

const buildCodeStep = (id: string) => ({
  id,
  name: `Code ${id}`,
  type: 'CODE' as const,
  valid: true,
  settings: {
    input: {
      logicFunctionId: '5f7b9b44-bb07-41ba-aef8-ec0eaa5eea2c',
      logicFunctionInput: {},
    },
    outputSchema: {},
    errorHandlingOptions: {
      retryOnFailure: { value: false },
      continueOnFailure: { value: false },
    },
  },
});

const buildWorkflowRunState = (
  overrides: Partial<WorkflowRunState>,
): WorkflowRunState => ({
  flow: {
    steps: [buildCodeStep('first'), buildCodeStep('second')],
    trigger: { type: 'MANUAL', settings: { outputSchema: {} } },
  },
  stepInfos: {
    first: { status: StepStatus.SUCCESS },
    second: { status: StepStatus.FAILED, error: 'Boom' },
  },
  ...overrides,
});

describe('getWorkflowRunFailedStepId', () => {
  it('returns the recorded failed step', () => {
    expect(
      getWorkflowRunFailedStepId(
        buildWorkflowRunState({ failedStepId: 'first' }),
      ),
    ).toBe('first');
  });

  it('falls back to the first failed step in flow order for older runs', () => {
    expect(getWorkflowRunFailedStepId(buildWorkflowRunState({}))).toBe(
      'second',
    );
  });

  it('returns undefined when no step failed', () => {
    expect(
      getWorkflowRunFailedStepId(
        buildWorkflowRunState({
          stepInfos: {
            first: { status: StepStatus.SUCCESS },
            second: { status: StepStatus.FAILED_SAFELY },
          },
        }),
      ),
    ).toBeUndefined();
    expect(getWorkflowRunFailedStepId(null)).toBeUndefined();
  });
});
