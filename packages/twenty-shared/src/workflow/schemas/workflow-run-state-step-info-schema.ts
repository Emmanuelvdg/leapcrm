import { z } from 'zod';
import { workflowRunStepErrorDetailsSchema } from './workflow-run-step-error-details-schema';
import { workflowRunStepStatusSchema } from './workflow-run-step-status-schema';

export const workflowRunStateStepInfoSchema = z.object({
  result: z.any().optional(),
  error: z.any().optional(),
  status: workflowRunStepStatusSchema,
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  attempt: z.number().optional(),
  errorDetails: workflowRunStepErrorDetailsSchema.optional(),
  get history() {
    return z
      .array(
        workflowRunStateStepInfoSchema.pick({
          result: true,
          status: true,
          error: true,
          startedAt: true,
          endedAt: true,
          errorDetails: true,
        }),
      )
      .optional();
  },
});
