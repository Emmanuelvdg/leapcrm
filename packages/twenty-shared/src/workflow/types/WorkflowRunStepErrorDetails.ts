import {
  type workflowRunStepErrorDetailsSchema,
  type workflowRunStepErrorPhaseSchema,
} from '@/workflow/schemas/workflow-run-step-error-details-schema';
import type z from 'zod';

export type WorkflowRunStepErrorPhase = z.infer<
  typeof workflowRunStepErrorPhaseSchema
>;

export type WorkflowRunStepErrorDetails = z.infer<
  typeof workflowRunStepErrorDetailsSchema
>;
