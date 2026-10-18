import { Command } from 'nest-commander';
import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

// Standard permission flags are only seeded at workspace creation, so a flag
// added later (PROSPECTING, and MCP_SERVERS before it) never reaches existing
// workspaces and cannot be granted to a role there.
@RegisteredWorkspaceCommand('2.33.0', 1792286576249)
@Command({
  name: 'upgrade:2-33:backfill-standard-permission-flags',
  description:
    'Create standard permission flags missing from workspaces created before the flag existed',
})
export class BackfillStandardPermissionFlagsCommand extends ProvisionedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly applicationService: ApplicationService,
    private readonly workspaceMigrationValidateBuildAndRunService: WorkspaceMigrationValidateBuildAndRunService,
    private readonly workspaceCacheService: WorkspaceCacheService,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    const isDryRun = options.dryRun ?? false;

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const { flatPermissionFlagMaps: existingFlatPermissionFlagMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatPermissionFlagMaps',
      ]);

    const { allFlatEntityMaps: standardAllFlatEntityMaps } =
      computeTwentyStandardApplicationAllFlatEntityMaps({
        now: new Date().toISOString(),
        workspaceId,
        twentyStandardApplicationId: twentyStandardFlatApplication.id,
      });

    const permissionFlagsToCreate = Object.values(
      standardAllFlatEntityMaps.flatPermissionFlagMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter(
        (permissionFlag) =>
          !isDefined(
            existingFlatPermissionFlagMaps.byUniversalIdentifier[
              permissionFlag.universalIdentifier
            ],
          ),
      );

    if (permissionFlagsToCreate.length === 0) {
      this.logger.log(
        `All standard permission flags already exist for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    const permissionFlagKeys = permissionFlagsToCreate
      .map((permissionFlag) => permissionFlag.key)
      .join(', ');

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would create permission flag(s) ${permissionFlagKeys} for workspace ${workspaceId}`,
      );

      return;
    }

    const validateAndBuildResult =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunLegacyWorkspaceMigration(
        {
          allFlatEntityOperationByMetadataName: {
            permissionFlag: {
              flatEntityToCreate: permissionFlagsToCreate,
              flatEntityToDelete: [],
              flatEntityToUpdate: [],
            },
          },
          workspaceId,
          applicationUniversalIdentifier:
            twentyStandardFlatApplication.universalIdentifier,
        },
      );

    if (validateAndBuildResult.status === 'fail') {
      this.logger.error(
        `Failed to backfill standard permission flags:\n${JSON.stringify(validateAndBuildResult, null, 2)}`,
      );

      throw new Error(
        `Failed to backfill standard permission flags for workspace ${workspaceId}`,
      );
    }

    this.logger.log(
      `Created permission flag(s) ${permissionFlagKeys} for workspace ${workspaceId}`,
    );
  }
}
