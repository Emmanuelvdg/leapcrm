import { type WorkflowActionType } from '@/workflow/types/Workflow';

export const API_CONNECTION_CALL_ACTION: {
  defaultLabel: string;
  type: Extract<WorkflowActionType, 'API_CONNECTION_CALL'>;
  icon: string;
} = {
  defaultLabel: 'API Call',
  type: 'API_CONNECTION_CALL',
  icon: 'IconApi',
};
