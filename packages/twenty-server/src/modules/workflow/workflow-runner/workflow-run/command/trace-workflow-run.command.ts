import { Command, Option } from 'nest-commander';
import { isDefined } from 'twenty-shared/utils';
import {
  buildWorkflowRunTrace,
  formatWorkflowRunTraceLines,
} from 'twenty-shared/workflow';

import {
  ProvisionedWorkspaceCommandRunner,
  type ProvisionedWorkspaceCommandOptions,
} from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type WorkflowRunWorkspaceEntity } from 'src/modules/workflow/common/standard-objects/workflow-run.workspace-entity';

type TraceWorkflowRunCommandOptions = ProvisionedWorkspaceCommandOptions & {
  workflowRunId: string;
  json?: boolean;
};

@Command({
  name: 'workflow:run:trace',
  description:
    'Print the step-by-step trace of a workflow run: execution order, timing, status and failure details',
})
export class TraceWorkflowRunCommand extends ProvisionedWorkspaceCommandRunner<TraceWorkflowRunCommandOptions> {
  private hasFoundWorkflowRun = false;

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
  ) {
    super(workspaceIteratorService);
  }

  @Option({
    flags: '--workflow-run-id <workflow_run_id>',
    description: 'Id of the workflow run to trace',
    required: true,
  })
  parseWorkflowRunId(value: string): string {
    return value;
  }

  @Option({
    flags: '--json',
    description: 'Print the trace as JSON instead of a readable list',
    required: false,
  })
  parseJson(): boolean {
    return true;
  }

  override async run(
    passedParams: string[],
    options: TraceWorkflowRunCommandOptions,
  ): Promise<void> {
    await super.run(passedParams, options);

    if (!this.hasFoundWorkflowRun) {
      this.logger.warn(
        `Workflow run ${options.workflowRunId} not found in the selected workspaces`,
      );
    }
  }

  override async runOnWorkspace({
    workspaceId,
    options,
  }: RunOnWorkspaceArgs & {
    options: TraceWorkflowRunCommandOptions;
  }): Promise<void> {
    const authContext = buildSystemAuthContext(workspaceId);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const workflowRunRepository =
        await this.globalWorkspaceOrmManager.getRepository<WorkflowRunWorkspaceEntity>(
          workspaceId,
          'workflowRun',
          { shouldBypassPermissionChecks: true },
        );

      const workflowRun = await workflowRunRepository.findOne({
        where: { id: options.workflowRunId },
      });

      if (!isDefined(workflowRun)) {
        return;
      }

      this.hasFoundWorkflowRun = true;

      const trace = buildWorkflowRunTrace({
        steps: workflowRun.state?.flow?.steps ?? [],
        stepInfos: workflowRun.state?.stepInfos ?? {},
      });

      if (options.json) {
        this.logger.log(
          JSON.stringify(
            {
              workspaceId,
              workflowRunId: workflowRun.id,
              name: workflowRun.name,
              status: workflowRun.status,
              startedAt: workflowRun.startedAt,
              endedAt: workflowRun.endedAt,
              error: workflowRun.state?.workflowRunError,
              failedStepId: workflowRun.state?.failedStepId,
              trace,
            },
            null,
            2,
          ),
        );

        return;
      }

      const lines = [
        `Workspace: ${workspaceId}`,
        ...formatWorkflowRunTraceLines({
          workflowRun: {
            id: workflowRun.id,
            name: workflowRun.name,
            status: workflowRun.status,
            startedAt: workflowRun.startedAt,
            endedAt: workflowRun.endedAt,
            error: workflowRun.state?.workflowRunError,
            failedStepId: workflowRun.state?.failedStepId,
          },
          trace,
        }),
      ];

      lines.forEach((line) => this.logger.log(line));
    }, authContext);
  }
}
