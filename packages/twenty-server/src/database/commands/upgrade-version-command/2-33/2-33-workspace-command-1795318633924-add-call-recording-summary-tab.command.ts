import { Command } from 'nest-commander';
import { STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS } from 'twenty-shared/metadata';
import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { getStandardFlatEntitiesToCreateOrThrow } from 'src/database/commands/upgrade-version-command/2-10/utils/get-standard-flat-entities-to-create-or-throw.util';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { type FlatPageLayoutTab } from 'src/engine/metadata-modules/flat-page-layout-tab/types/flat-page-layout-tab.type';
import { type FlatPageLayoutWidget } from 'src/engine/metadata-modules/flat-page-layout-widget/types/flat-page-layout-widget.type';
import { type FlatPageLayout } from 'src/engine/metadata-modules/flat-page-layout/types/flat-page-layout.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const { callRecordingRecordPage } = STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS;

const SUMMARY_TAB = callRecordingRecordPage.tabs.summary;

@RegisteredWorkspaceCommand('2.33.0', 1795318633924)
@Command({
  name: 'upgrade:2-33:add-call-recording-summary-tab',
  description:
    'Adds the AI summary tab to the call recording record page in existing workspaces',
})
export class AddCallRecordingSummaryTabCommand extends ProvisionedWorkspaceCommandRunner {
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

    const {
      flatPageLayoutMaps,
      flatPageLayoutTabMaps,
      flatPageLayoutWidgetMaps,
    } = await this.workspaceCacheService.getOrRecompute(workspaceId, [
      'flatPageLayoutMaps',
      'flatPageLayoutTabMaps',
      'flatPageLayoutWidgetMaps',
    ]);

    const callRecordingPageLayout =
      findFlatEntityByUniversalIdentifier<FlatPageLayout>({
        flatEntityMaps: flatPageLayoutMaps,
        universalIdentifier: callRecordingRecordPage.universalIdentifier,
      });

    if (!isDefined(callRecordingPageLayout)) {
      this.logger.log(
        `Call recording page layout missing for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const { allFlatEntityMaps: standardAllFlatEntityMaps } =
      computeTwentyStandardApplicationAllFlatEntityMaps({
        now: new Date().toISOString(),
        workspaceId,
        twentyStandardApplicationId: twentyStandardFlatApplication.id,
      });

    const allFlatEntityOperationByMetadataName = {
      pageLayoutTab: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatPageLayoutTab>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatPageLayoutTabMaps,
            existingFlatEntityMaps: flatPageLayoutTabMaps,
            universalIdentifiers: [SUMMARY_TAB.universalIdentifier],
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      pageLayoutWidget: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatPageLayoutWidget>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatPageLayoutWidgetMaps,
            existingFlatEntityMaps: flatPageLayoutWidgetMaps,
            universalIdentifiers: [
              SUMMARY_TAB.widgets.summary.universalIdentifier,
            ],
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
    };

    const totalOperationCount = Object.values(
      allFlatEntityOperationByMetadataName,
    ).reduce(
      (total, operation) => total + operation.flatEntityToCreate.length,
      0,
    );

    if (totalOperationCount === 0) {
      this.logger.log(
        `Call recording summary tab already exists for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would add the call recording summary tab for workspace ${workspaceId}`,
      );

      return;
    }

    const result =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunLegacyWorkspaceMigration(
        {
          isSystemBuild: true,
          workspaceId,
          applicationUniversalIdentifier:
            twentyStandardFlatApplication.universalIdentifier,
          allFlatEntityOperationByMetadataName,
        },
      );

    if (result.status === 'fail') {
      this.logger.error(
        `Failed to add the call recording summary tab:\n${JSON.stringify(result, null, 2)}`,
      );

      throw new Error(
        `Failed to add the call recording summary tab for workspace ${workspaceId}`,
      );
    }

    this.logger.log(
      `Added the call recording summary tab for workspace ${workspaceId}`,
    );
  }
}
