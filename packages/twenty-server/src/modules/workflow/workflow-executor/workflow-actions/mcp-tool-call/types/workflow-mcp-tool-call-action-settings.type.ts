import {
  type BaseWorkflowActionSettings,
  type WithExpectedOutputSchema,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';

import { type WorkflowMcpToolCallActionInput } from './workflow-mcp-tool-call-action-input.type';

export type WorkflowMcpToolCallActionSettings = BaseWorkflowActionSettings &
  WithExpectedOutputSchema & {
    input: WorkflowMcpToolCallActionInput;
  };
