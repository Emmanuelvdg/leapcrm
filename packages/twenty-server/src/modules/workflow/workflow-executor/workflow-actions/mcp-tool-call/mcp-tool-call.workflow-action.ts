import { Injectable } from '@nestjs/common';

import { type WorkflowRunStepLog } from 'twenty-shared/workflow';

import { McpToolCallTool } from 'src/engine/core-modules/mcp-connection/tools/mcp-tool-call.tool';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { type Tool } from 'src/engine/core-modules/tool/types/tool.type';
import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { isWorkflowMcpToolCallAction } from 'src/modules/workflow/workflow-executor/workflow-actions/mcp-tool-call/guards/is-workflow-mcp-tool-call-action.guard';
import { type WorkflowMcpToolCallActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/mcp-tool-call/types/workflow-mcp-tool-call-action-input.type';
import { buildMcpToolCallStepLog } from 'src/modules/workflow/workflow-executor/workflow-actions/mcp-tool-call/utils/build-mcp-tool-call-step-log.util';
import { ToolBackedWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/tool-backed/tool-backed.workflow-action';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { WorkflowRunStepLogWorkspaceService } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run-step-log.workspace-service';

@Injectable()
export class McpToolCallWorkflowAction extends ToolBackedWorkflowAction<WorkflowMcpToolCallActionInput> {
  constructor(
    private readonly mcpToolCallTool: McpToolCallTool,
    workflowRunStepLogService: WorkflowRunStepLogWorkspaceService,
  ) {
    super(McpToolCallWorkflowAction.name, workflowRunStepLogService);
  }

  protected getTool(): Tool {
    return this.mcpToolCallTool;
  }

  protected assertStep(step: WorkflowAction): void {
    if (!isWorkflowMcpToolCallAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not an MCP tool call action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }
  }

  protected buildStepLog({
    input,
    output,
    durationMs,
  }: {
    input: WorkflowMcpToolCallActionInput;
    output: ToolOutput;
    durationMs: number;
  }): WorkflowRunStepLog {
    return buildMcpToolCallStepLog({ input, output, durationMs });
  }
}
