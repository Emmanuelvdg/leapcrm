import { Command } from 'nest-commander';
import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { STANDARD_AGENT } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-agent.constant';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

// Older workspaces were seeded with "Twenty CRM" in the description.
const UPSTREAM_BRAND_PATTERN = /\bTwenty(?: CRM)?\b/g;

@RegisteredWorkspaceCommand('2.33.0', 1794883064835)
@Command({
  name: 'upgrade:2-33:rebrand-helper-agent',
  description:
    'Replace the upstream product name in the standard Helper agent prompt and description of existing workspaces',
})
export class RebrandHelperAgentCommand extends ProvisionedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly applicationService: ApplicationService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly workspaceMigrationValidateBuildAndRunService: WorkspaceMigrationValidateBuildAndRunService,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    const isDryRun = options.dryRun ?? false;

    const { flatAgentMaps } = await this.workspaceCacheService.getOrRecompute(
      workspaceId,
      ['flatAgentMaps'],
    );

    const helperAgent =
      flatAgentMaps.byUniversalIdentifier[
        STANDARD_AGENT.helper.universalIdentifier
      ];

    if (!isDefined(helperAgent)) {
      this.logger.log(`No Helper agent for workspace ${workspaceId}, skipping`);

      return;
    }

    const prompt = helperAgent.prompt.replace(
      UPSTREAM_BRAND_PATTERN,
      'LeapCRM',
    );
    const description =
      helperAgent.description?.replace(UPSTREAM_BRAND_PATTERN, 'LeapCRM') ??
      null;

    if (
      prompt === helperAgent.prompt &&
      description === helperAgent.description
    ) {
      this.logger.log(
        `Helper agent already rebranded for workspace ${workspaceId}`,
      );

      return;
    }

    this.logger.log(
      `${isDryRun ? '[DRY RUN] Would rebrand' : 'Rebranding'} the Helper agent for workspace ${workspaceId}`,
    );

    if (isDryRun) {
      return;
    }

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const validateAndBuildResult =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunLegacyWorkspaceMigration(
        {
          allFlatEntityOperationByMetadataName: {
            agent: {
              flatEntityToCreate: [],
              flatEntityToDelete: [],
              flatEntityToUpdate: [
                {
                  ...helperAgent,
                  prompt,
                  description,
                  updatedAt: new Date().toISOString(),
                },
              ],
            },
          },
          workspaceId,
          applicationUniversalIdentifier:
            twentyStandardFlatApplication.universalIdentifier,
        },
      );

    if (validateAndBuildResult.status === 'fail') {
      this.logger.error(
        `Failed to rebrand the Helper agent:\n${JSON.stringify(validateAndBuildResult, null, 2)}`,
      );

      throw new Error(
        `Failed to rebrand the Helper agent for workspace ${workspaceId}`,
      );
    }
  }
}
