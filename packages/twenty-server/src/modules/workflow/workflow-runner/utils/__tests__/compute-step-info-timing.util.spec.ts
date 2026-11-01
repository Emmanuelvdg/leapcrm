import { StepStatus } from 'twenty-shared/workflow';

import { computeStepInfoTiming } from 'src/modules/workflow/workflow-runner/utils/compute-step-info-timing.util';

const NOW = '2026-11-01T10:00:00.000Z';
const EARLIER = '2026-11-01T09:59:00.000Z';

describe('computeStepInfoTiming', () => {
  it('stamps the start when a step starts running', () => {
    expect(
      computeStepInfoTiming({
        previousStepInfo: {
          status: StepStatus.NOT_STARTED,
          startedAt: EARLIER,
          endedAt: EARLIER,
        },
        nextStatus: StepStatus.RUNNING,
        now: NOW,
      }),
    ).toEqual({ startedAt: NOW, endedAt: undefined });
  });

  it('keeps the original start when a running iterator re-enters', () => {
    expect(
      computeStepInfoTiming({
        previousStepInfo: { status: StepStatus.RUNNING, startedAt: EARLIER },
        nextStatus: StepStatus.RUNNING,
        now: NOW,
      }),
    ).toEqual({ startedAt: EARLIER, endedAt: undefined });
  });

  it('stamps the end when a step finishes', () => {
    expect(
      computeStepInfoTiming({
        previousStepInfo: { status: StepStatus.RUNNING, startedAt: EARLIER },
        nextStatus: StepStatus.FAILED,
        now: NOW,
      }),
    ).toEqual({ startedAt: EARLIER, endedAt: NOW });
  });

  it('leaves the end empty while a step waits for an event', () => {
    expect(
      computeStepInfoTiming({
        previousStepInfo: { status: StepStatus.RUNNING, startedAt: EARLIER },
        nextStatus: StepStatus.PENDING,
        now: NOW,
      }),
    ).toEqual({ startedAt: EARLIER, endedAt: undefined });
  });
});
