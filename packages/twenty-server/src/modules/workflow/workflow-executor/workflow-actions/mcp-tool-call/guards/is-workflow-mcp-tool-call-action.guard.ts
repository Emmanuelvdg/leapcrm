import { WorkflowActionType } from 'twenty-shared/workflow';
import {
  type WorkflowAction,
  type WorkflowMcpToolCallAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowMcpToolCallAction = (
  action: WorkflowAction,
): action is WorkflowMcpToolCallAction => {
  return action.type === WorkflowActionType.MCP_TOOL_CALL;
};
