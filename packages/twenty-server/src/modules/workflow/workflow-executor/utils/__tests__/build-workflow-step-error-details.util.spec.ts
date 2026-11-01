import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { buildWorkflowStepErrorDetails } from 'src/modules/workflow/workflow-executor/utils/build-workflow-step-error-details.util';

describe('buildWorkflowStepErrorDetails', () => {
  it('captures the type, code and stack of a system error', () => {
    const error = Object.assign(new Error('duplicate key value'), {
      code: '23505',
    });

    const errorDetails = buildWorkflowStepErrorDetails({
      error,
      phase: 'EXECUTE',
      isSystemError: true,
    });

    expect(errorDetails).toMatchObject({
      message: 'duplicate key value',
      phase: 'EXECUTE',
      isSystemError: true,
      type: 'Error',
      code: '23505',
    });
    expect(errorDetails.stack).toContain('duplicate key value');
  });

  it('omits the stack for user errors', () => {
    const errorDetails = buildWorkflowStepErrorDetails({
      error: new WorkflowStepExecutorException(
        'Object name is missing',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      ),
      phase: 'EXECUTE',
      isSystemError: false,
    });

    expect(errorDetails).toEqual({
      message: 'Object name is missing',
      phase: 'EXECUTE',
      isSystemError: false,
      type: 'WorkflowStepExecutorException',
      code: WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      stack: undefined,
    });
  });

  it('wraps a plain error message', () => {
    expect(
      buildWorkflowStepErrorDetails({
        error: 'Record not found',
        phase: 'EXECUTE',
        isSystemError: false,
      }),
    ).toEqual({
      message: 'Record not found',
      phase: 'EXECUTE',
      isSystemError: false,
    });
  });
});
