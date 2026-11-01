import { Command, Option } from 'nest-commander';
import { isDefined } from 'twenty-shared/utils';
import {
  buildWorkflowRunTrace,
  type WorkflowRunTraceEntry,
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
        `Workflow run ${workflowRun.name ?? ''} (${workflowRun.id}) in workspace ${workspaceId}`,
        `Status: ${workflowRun.status}  started: ${workflowRun.startedAt ?? '-'}  ended: ${workflowRun.endedAt ?? '-'}`,
        ...(isDefined(workflowRun.state?.workflowRunError)
          ? [`Error: ${workflowRun.state.workflowRunError}`]
          : []),
        ...(isDefined(workflowRun.state?.failedStepId)
          ? [`Failed step: ${workflowRun.state.failedStepId}`]
          : []),
        '',
        ...trace.flatMap((entry, index) =>
          this.formatTraceEntry(entry, index + 1),
        ),
      ];

      lines.forEach((line) => this.logger.log(line));
    }, authContext);
  }

  private formatTraceEntry(
    entry: WorkflowRunTraceEntry,
    position: number,
  ): string[] {
    const iterationLabel = isDefined(entry.iteration)
      ? ` [iteration ${entry.iteration}]`
      : '';
    const attemptLabel =
      isDefined(entry.attempt) && entry.attempt > 1
        ? ` [attempt ${entry.attempt}]`
        : '';
    const durationLabel = isDefined(entry.durationMs)
      ? `${entry.durationMs}ms`
      : '-';
    const branchLabel = isDefined(entry.matchingBranchId)
      ? ` -> branch ${entry.matchingBranchId}`
      : '';

    const lines = [
      `${position}. ${entry.status.padEnd(13)} ${entry.startedAt ?? '-'}  ${durationLabel.padStart(8)}  "${entry.stepName}" (${entry.stepType}) ${entry.stepId}${iterationLabel}${attemptLabel}${branchLabel}`,
    ];

    const errorDetails = entry.errorDetails;

    if (!isDefined(errorDetails)) {
      if (isDefined(entry.error)) {
        lines.push(`     error: ${entry.error}`);
      }

      return lines;
    }

    lines.push(`     error: ${errorDetails.message}`);
    lines.push(
      `     phase: ${errorDetails.phase}  system error: ${errorDetails.isSystemError}${
        isDefined(errorDetails.type) ? `  type: ${errorDetails.type}` : ''
      }${isDefined(errorDetails.code) ? `  code: ${errorDetails.code}` : ''}`,
    );

    if (isDefined(errorDetails.emptyVariables)) {
      lines.push(
        `     empty variables: ${errorDetails.emptyVariables.join(', ')}`,
      );
    }

    if (isDefined(errorDetails.resolvedInput)) {
      lines.push(
        `     input${errorDetails.resolvedInputTruncated ? ' (truncated)' : ''}: ${
          typeof errorDetails.resolvedInput === 'string'
            ? errorDetails.resolvedInput
            : JSON.stringify(errorDetails.resolvedInput)
        }`,
      );
    }

    if (isDefined(errorDetails.stack)) {
      lines.push(`     stack: ${errorDetails.stack}`);
    }

    return lines;
  }
}
