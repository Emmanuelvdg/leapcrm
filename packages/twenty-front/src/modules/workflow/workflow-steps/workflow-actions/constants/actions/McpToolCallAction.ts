import { type WorkflowActionType } from '@/workflow/types/Workflow';

export const MCP_TOOL_CALL_ACTION: {
  defaultLabel: string;
  type: Extract<WorkflowActionType, 'MCP_TOOL_CALL'>;
  icon: string;
} = {
  defaultLabel: 'MCP Tool',
  type: 'MCP_TOOL_CALL',
  icon: 'IconPlug',
};
