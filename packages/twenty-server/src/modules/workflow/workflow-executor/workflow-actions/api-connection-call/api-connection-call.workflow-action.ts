import { Injectable } from '@nestjs/common';

import { type WorkflowRunStepLog } from 'twenty-shared/workflow';

import { ApiConnectionCallTool } from 'src/engine/core-modules/api-connection/tools/api-connection-call.tool';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { type Tool } from 'src/engine/core-modules/tool/types/tool.type';
import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { isWorkflowApiConnectionCallAction } from 'src/modules/workflow/workflow-executor/workflow-actions/api-connection-call/guards/is-workflow-api-connection-call-action.guard';
import { type WorkflowApiConnectionCallActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/api-connection-call/types/workflow-api-connection-call-action-input.type';
import { buildApiConnectionCallStepLog } from 'src/modules/workflow/workflow-executor/workflow-actions/api-connection-call/utils/build-api-connection-call-step-log.util';
import { ToolBackedWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/tool-backed/tool-backed.workflow-action';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { WorkflowRunStepLogWorkspaceService } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run-step-log.workspace-service';

@Injectable()
export class ApiConnectionCallWorkflowAction extends ToolBackedWorkflowAction<WorkflowApiConnectionCallActionInput> {
  constructor(
    private readonly apiConnectionCallTool: ApiConnectionCallTool,
    workflowRunStepLogService: WorkflowRunStepLogWorkspaceService,
  ) {
    super(ApiConnectionCallWorkflowAction.name, workflowRunStepLogService);
  }

  protected getTool(): Tool {
    return this.apiConnectionCallTool;
  }

  protected assertStep(step: WorkflowAction): void {
    if (!isWorkflowApiConnectionCallAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not an API connection call action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }
  }

  protected buildStepLog({
    input,
    output,
    durationMs,
  }: {
    input: WorkflowApiConnectionCallActionInput;
    output: ToolOutput;
    durationMs: number;
  }): WorkflowRunStepLog {
    return buildApiConnectionCallStepLog({ input, output, durationMs });
  }
}
