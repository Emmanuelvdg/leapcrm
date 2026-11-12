import {
  type BaseWorkflowActionSettings,
  type WithExpectedOutputSchema,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';

import { type WorkflowApiConnectionCallActionInput } from './workflow-api-connection-call-action-input.type';

export type WorkflowApiConnectionCallActionSettings =
  BaseWorkflowActionSettings &
    WithExpectedOutputSchema & {
      input: WorkflowApiConnectionCallActionInput;
    };
