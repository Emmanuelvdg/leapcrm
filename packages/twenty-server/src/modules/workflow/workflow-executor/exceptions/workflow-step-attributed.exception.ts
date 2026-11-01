import { type WorkflowRunStepErrorPhase } from 'twenty-shared/workflow';

// Carries the step being processed up to the job, which ends the run and rethrows the original error
export class WorkflowStepAttributedException extends Error {
  readonly stepId: string;
  readonly phase: WorkflowRunStepErrorPhase;
  readonly originalError: unknown;

  constructor({
    stepId,
    phase,
    originalError,
  }: {
    stepId: string;
    phase: WorkflowRunStepErrorPhase;
    originalError: unknown;
  }) {
    super(
      originalError instanceof Error
        ? originalError.message
        : String(originalError),
    );
    this.name = 'WorkflowStepAttributedException';
    this.stepId = stepId;
    this.phase = phase;
    this.originalError = originalError;
  }
}
