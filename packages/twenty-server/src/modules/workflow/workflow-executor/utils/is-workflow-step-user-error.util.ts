import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';

const USER_ERROR_CODES = [
  WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
  WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
  WorkflowStepExecutorExceptionCode.STEP_NOT_FOUND,
];

export const isWorkflowStepUserError = (error: unknown): boolean =>
  error instanceof WorkflowStepExecutorException &&
  USER_ERROR_CODES.includes(error.code);
