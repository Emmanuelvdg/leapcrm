import { Command } from 'nest-commander';

import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { BackfillStandardPermissionFlagsCommand } from 'src/database/commands/upgrade-version-command/2-33/2-33-workspace-command-1792286576249-backfill-standard-permission-flags.command';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

// The 1792286576249 backfill already ran in existing workspaces before
// ICP_ANALYSIS existed, so the same backfill runs again under a later timestamp.
@RegisteredWorkspaceCommand('2.33.0', 1794106415335)
@Command({
  name: 'upgrade:2-33:backfill-icp-analysis-permission-flag',
  description:
    'Create the ICP_ANALYSIS standard permission flag in workspaces created before it existed',
})
export class BackfillIcpAnalysisPermissionFlagCommand extends BackfillStandardPermissionFlagsCommand {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    applicationService: ApplicationService,
    workspaceMigrationValidateBuildAndRunService: WorkspaceMigrationValidateBuildAndRunService,
    workspaceCacheService: WorkspaceCacheService,
  ) {
    super(
      workspaceIteratorService,
      applicationService,
      workspaceMigrationValidateBuildAndRunService,
      workspaceCacheService,
    );
  }
}
