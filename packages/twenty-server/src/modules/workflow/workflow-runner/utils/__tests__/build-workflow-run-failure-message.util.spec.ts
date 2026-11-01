import { WorkflowActionType } from 'twenty-shared/workflow';

import { buildWorkflowRunFailureMessage } from 'src/modules/workflow/workflow-runner/utils/build-workflow-run-failure-message.util';

const step = { name: 'Update company', type: WorkflowActionType.UPDATE_RECORD };

describe('buildWorkflowRunFailureMessage', () => {
  it.each([
    [
      'EXECUTE' as const,
      'Step "Update company" (UPDATE_RECORD) failed: Invalid field value',
    ],
    [
      'PREFLIGHT' as const,
      'Step "Update company" (UPDATE_RECORD) could not be prepared: Invalid field value',
    ],
    [
      'ORCHESTRATION' as const,
      'Workflow engine error at step "Update company" (UPDATE_RECORD): Invalid field value',
    ],
  ])('names the step for %s errors', (phase, expectedMessage) => {
    expect(
      buildWorkflowRunFailureMessage({
        step,
        errorMessage: 'Invalid field value',
        phase,
      }),
    ).toBe(expectedMessage);
  });
});
