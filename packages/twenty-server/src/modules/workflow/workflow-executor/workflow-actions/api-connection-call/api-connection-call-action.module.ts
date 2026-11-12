import { Module } from '@nestjs/common';

import { ApiConnectionModule } from 'src/engine/core-modules/api-connection/api-connection.module';
import { ApiConnectionCallWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/api-connection-call/api-connection-call.workflow-action';
import { WorkflowRunModule } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run.module';

@Module({
  imports: [ApiConnectionModule, WorkflowRunModule],
  providers: [ApiConnectionCallWorkflowAction],
  exports: [ApiConnectionCallWorkflowAction],
})
export class ApiConnectionCallActionModule {}
