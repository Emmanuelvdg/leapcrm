import { Module } from '@nestjs/common';

import { McpConnectionModule } from 'src/engine/core-modules/mcp-connection/mcp-connection.module';
import { McpToolCallWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/mcp-tool-call/mcp-tool-call.workflow-action';
import { WorkflowRunModule } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run.module';

@Module({
  imports: [McpConnectionModule, WorkflowRunModule],
  providers: [McpToolCallWorkflowAction],
  exports: [McpToolCallWorkflowAction],
})
export class McpToolCallActionModule {}
