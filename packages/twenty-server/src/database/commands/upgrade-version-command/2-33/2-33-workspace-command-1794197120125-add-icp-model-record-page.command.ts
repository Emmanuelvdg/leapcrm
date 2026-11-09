import { Command } from 'nest-commander';
import {
  STANDARD_OBJECTS,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-shared/metadata';
import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { getStandardFlatEntitiesToCreateOrThrow } from 'src/database/commands/upgrade-version-command/2-10/utils/get-standard-flat-entities-to-create-or-throw.util';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type FlatPageLayoutTab } from 'src/engine/metadata-modules/flat-page-layout-tab/types/flat-page-layout-tab.type';
import { type FlatPageLayoutWidget } from 'src/engine/metadata-modules/flat-page-layout-widget/types/flat-page-layout-widget.type';
import { type FlatPageLayout } from 'src/engine/metadata-modules/flat-page-layout/types/flat-page-layout.type';
import { type FlatViewFieldGroup } from 'src/engine/metadata-modules/flat-view-field-group/types/flat-view-field-group.type';
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const { icpModelRecordPage } = STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS;
const { icpModelRecordPageFields } = STANDARD_OBJECTS.icpModel.views;

const ICP_MODEL_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIERS = Object.values(
  icpModelRecordPage.tabs,
).map(({ universalIdentifier }) => universalIdentifier);

const ICP_MODEL_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIERS = Object.values(
  icpModelRecordPage.tabs,
).flatMap(({ widgets }) =>
  Object.values(widgets).map(({ universalIdentifier }) => universalIdentifier),
);

const ICP_MODEL_FIELDS_VIEW_FIELD_UNIVERSAL_IDENTIFIERS = Object.values(
  icpModelRecordPageFields.viewFields,
).map(({ universalIdentifier }) => universalIdentifier);

const ICP_MODEL_FIELDS_VIEW_FIELD_GROUP_UNIVERSAL_IDENTIFIERS = Object.values(
  icpModelRecordPageFields.viewFieldGroups,
).map(({ universalIdentifier }) => universalIdentifier);

// Runs after the ICP analysis metadata sync, which created the object this
// page belongs to, and needs the ICP_ANALYSIS widget type from the 2.33
// instance command.
@RegisteredWorkspaceCommand('2.33.0', 1794197120125)
@Command({
  name: 'upgrade:2-33:add-icp-model-record-page',
  description:
    'Adds the ICP model record page, its fields view and the ICP analysis widget to existing workspaces',
})
export class AddIcpModelRecordPageCommand extends ProvisionedWorkspaceCommandRunner {
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
      flatObjectMetadataMaps,
      flatPageLayoutMaps,
      flatPageLayoutTabMaps,
      flatPageLayoutWidgetMaps,
      flatViewMaps,
      flatViewFieldMaps,
      flatViewFieldGroupMaps,
    } = await this.workspaceCacheService.getOrRecompute(workspaceId, [
      'flatObjectMetadataMaps',
      'flatPageLayoutMaps',
      'flatPageLayoutTabMaps',
      'flatPageLayoutWidgetMaps',
      'flatViewMaps',
      'flatViewFieldMaps',
      'flatViewFieldGroupMaps',
    ]);

    const icpModelObjectMetadata =
      findFlatEntityByUniversalIdentifier<FlatObjectMetadata>({
        flatEntityMaps: flatObjectMetadataMaps,
        universalIdentifier: STANDARD_OBJECTS.icpModel.universalIdentifier,
      });

    if (!isDefined(icpModelObjectMetadata)) {
      this.logger.log(
        `ICP model object missing for workspace ${workspaceId}, skipping`,
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

    // The fields widget points at the fields view, so both are created in
    // the same migration.
    const allFlatEntityOperationByMetadataName = {
      view: {
        flatEntityToCreate: getStandardFlatEntitiesToCreateOrThrow<FlatView>({
          standardFlatEntityMaps: standardAllFlatEntityMaps.flatViewMaps,
          existingFlatEntityMaps: flatViewMaps,
          universalIdentifiers: [icpModelRecordPageFields.universalIdentifier],
        }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      viewFieldGroup: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatViewFieldGroup>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatViewFieldGroupMaps,
            existingFlatEntityMaps: flatViewFieldGroupMaps,
            universalIdentifiers:
              ICP_MODEL_FIELDS_VIEW_FIELD_GROUP_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      viewField: {
        flatEntityToCreate: getStandardFlatEntitiesToCreateOrThrow<FlatViewField>(
          {
            standardFlatEntityMaps: standardAllFlatEntityMaps.flatViewFieldMaps,
            existingFlatEntityMaps: flatViewFieldMaps,
            universalIdentifiers:
              ICP_MODEL_FIELDS_VIEW_FIELD_UNIVERSAL_IDENTIFIERS,
          },
        ),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      pageLayout: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatPageLayout>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatPageLayoutMaps,
            existingFlatEntityMaps: flatPageLayoutMaps,
            universalIdentifiers: [icpModelRecordPage.universalIdentifier],
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      pageLayoutTab: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatPageLayoutTab>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatPageLayoutTabMaps,
            existingFlatEntityMaps: flatPageLayoutTabMaps,
            universalIdentifiers:
              ICP_MODEL_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIERS,
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
            universalIdentifiers:
              ICP_MODEL_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIERS,
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
        `ICP model record page already exists for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would apply ${totalOperationCount} ICP model record page operations for workspace ${workspaceId}`,
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
        `Failed to add the ICP model record page:\n${JSON.stringify(result, null, 2)}`,
      );

      throw new Error(
        `Failed to add the ICP model record page for workspace ${workspaceId}`,
      );
    }

    this.logger.log(
      `Applied ${totalOperationCount} ICP model record page operations for workspace ${workspaceId}`,
    );
  }
}
