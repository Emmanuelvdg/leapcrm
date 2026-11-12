import { z } from 'zod';
import { workflowApiConnectionCallActionSettingsSchema } from './api-connection-call-action-settings-schema';
import { baseWorkflowActionSchema } from './base-workflow-action-schema';

export const workflowApiConnectionCallActionSchema =
  baseWorkflowActionSchema.extend({
    type: z.literal('API_CONNECTION_CALL'),
    settings: workflowApiConnectionCallActionSettingsSchema,
  });
