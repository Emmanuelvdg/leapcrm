import { StepStatus } from 'twenty-shared/workflow';

import { findFirstFailedStepId } from 'src/modules/workflow/workflow-executor/utils/find-first-failed-step-id.util';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

const steps = [
  { id: 'step-1' },
  { id: 'step-2' },
  { id: 'step-3' },
] as WorkflowAction[];

describe('findFirstFailedStepId', () => {
  it('returns undefined when no step failed', () => {
    expect(
      findFirstFailedStepId({
        steps,
        stepInfos: {
          'step-1': { status: StepStatus.SUCCESS },
          'step-2': { status: StepStatus.FAILED_SAFELY },
        },
      }),
    ).toBeUndefined();
  });

  it('returns the step that failed first', () => {
    expect(
      findFirstFailedStepId({
        steps,
        stepInfos: {
          'step-1': { status: StepStatus.SUCCESS },
          'step-2': {
            status: StepStatus.FAILED,
            endedAt: '2026-11-01T10:00:05.000Z',
          },
          'step-3': {
            status: StepStatus.FAILED,
            endedAt: '2026-11-01T10:00:02.000Z',
          },
        },
      }),
    ).toBe('step-3');
  });

  it('falls back to flow order when failures have no end time', () => {
    expect(
      findFirstFailedStepId({
        steps,
        stepInfos: {
          'step-2': { status: StepStatus.FAILED },
          'step-3': { status: StepStatus.FAILED },
        },
      }),
    ).toBe('step-2');
  });
});
