import { z } from 'zod';

export const workflowRunStepErrorPhaseSchema = z.enum([
  'PREFLIGHT',
  'EXECUTE',
  'ORCHESTRATION',
]);

export const workflowRunStepErrorDetailsSchema = z.object({
  message: z.string(),
  phase: workflowRunStepErrorPhaseSchema,
  isSystemError: z.boolean(),
  type: z.string().optional(),
  code: z.string().optional(),
  stack: z.string().optional(),
  resolvedInput: z.any().optional(),
  resolvedInputTruncated: z.boolean().optional(),
  emptyVariables: z.array(z.string()).optional(),
});
