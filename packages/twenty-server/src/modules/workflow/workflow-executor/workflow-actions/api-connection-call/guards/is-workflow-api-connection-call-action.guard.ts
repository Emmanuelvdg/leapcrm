import { WorkflowActionType } from 'twenty-shared/workflow';

import {
  type WorkflowAction,
  type WorkflowApiConnectionCallAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowApiConnectionCallAction = (
  action: WorkflowAction,
): action is WorkflowApiConnectionCallAction => {
  return action.type === WorkflowActionType.API_CONNECTION_CALL;
};
