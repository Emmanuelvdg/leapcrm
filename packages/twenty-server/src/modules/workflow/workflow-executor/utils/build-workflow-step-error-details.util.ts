import { isDefined } from 'twenty-shared/utils';
import {
  type WorkflowRunStepErrorDetails,
  type WorkflowRunStepErrorPhase,
} from 'twenty-shared/workflow';

import { truncateStringToUtf8ByteBudget } from 'src/utils/truncate-string-to-utf8-byte-budget.util';

const MAX_STACK_BYTES = 4_000;

const getErrorCode = (error: Error): string | undefined => {
  const code = (error as { code?: unknown }).code;

  return typeof code === 'string' || typeof code === 'number'
    ? String(code)
    : undefined;
};

export const buildWorkflowStepErrorDetails = ({
  error,
  phase,
  isSystemError,
}: {
  error: unknown;
  phase: WorkflowRunStepErrorPhase;
  isSystemError: boolean;
}): WorkflowRunStepErrorDetails => {
  if (!(error instanceof Error)) {
    return {
      message: typeof error === 'string' ? error : String(error),
      phase,
      isSystemError,
    };
  }

  return {
    message: error.message,
    phase,
    isSystemError,
    type: error.constructor.name,
    code: getErrorCode(error),
    stack:
      isSystemError && isDefined(error.stack)
        ? truncateStringToUtf8ByteBudget(error.stack, MAX_STACK_BYTES).value
        : undefined,
  };
};
