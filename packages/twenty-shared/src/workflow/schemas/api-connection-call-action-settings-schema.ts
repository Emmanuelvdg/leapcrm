import { z } from 'zod';
import { baseWorkflowActionSettingsSchema } from './base-workflow-action-settings-schema';
import { expectedOutputSchemaShape } from './expected-output-schema-shape';

export const workflowApiConnectionCallActionSettingsSchema =
  baseWorkflowActionSettingsSchema.extend({
    input: z.object({
      connectionId: z.string().nullable().optional(),
      operationName: z.string().nullable().optional(),
      arguments: z.record(z.string(), z.any()).optional(),
    }),
    ...expectedOutputSchemaShape,
  });
