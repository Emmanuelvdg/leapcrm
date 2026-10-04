import { z } from 'zod';
import { baseWorkflowActionSchema } from './base-workflow-action-schema';
import { workflowMcpToolCallActionSettingsSchema } from './mcp-tool-call-action-settings-schema';

export const workflowMcpToolCallActionSchema = baseWorkflowActionSchema.extend({
  type: z.literal('MCP_TOOL_CALL'),
  settings: workflowMcpToolCallActionSettingsSchema,
});
