import { t } from '@lingui/core/macro';
import { StepStatus } from 'twenty-shared/workflow';

export const getWorkflowRunTraceStepStatusLabel = (status: StepStatus) => {
  switch (status) {
    case StepStatus.SUCCESS:
      return t`Succeeded`;
    case StepStatus.FAILED:
      return t`Failed`;
    case StepStatus.FAILED_SAFELY:
      return t`Failed, run continued`;
    case StepStatus.RUNNING:
      return t`Running`;
    case StepStatus.PENDING:
      return t`Waiting`;
    case StepStatus.STOPPED:
      return t`Stopped`;
    case StepStatus.SKIPPED:
      return t`Skipped`;
    case StepStatus.NOT_STARTED:
      return t`Not started`;
  }
};
