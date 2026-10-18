import { Command } from 'nest-commander';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { buildNavigationCommandMenuItemOperationsOrThrow } from 'src/database/commands/upgrade-version-command/2-10/utils/build-navigation-command-menu-item-operations-or-throw.util';
import {
  getExistingOrStandardFlatEntityOrThrow,
  getStandardFlatEntitiesToCreateOrThrow,
} from 'src/database/commands/upgrade-version-command/2-10/utils/get-standard-flat-entities-to-create-or-throw.util';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatIndexMetadata } from 'src/engine/metadata-modules/flat-index-metadata/types/flat-index-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const getUniversalIdentifiers = (
  entitiesByName: Record<string, { universalIdentifier: string }>,
): string[] =>
  Object.values(entitiesByName).map((entity) => entity.universalIdentifier);

const PROSPECTING_OBJECT_METADATA_UNIVERSAL_IDENTIFIERS = [
  STANDARD_OBJECTS.prospectingCampaign.universalIdentifier,
  STANDARD_OBJECTS.prospectCandidate.universalIdentifier,
];

const PROSPECTING_FIELD_METADATA_UNIVERSAL_IDENTIFIERS = [
  ...getUniversalIdentifiers(STANDARD_OBJECTS.prospectingCampaign.fields),
  ...getUniversalIdentifiers(STANDARD_OBJECTS.prospectCandidate.fields),
  // Reverse side of prospectCandidate.matchedCompany, defined in the company
  // field-metadata builder.
  STANDARD_OBJECTS.company.fields.prospectCandidates.universalIdentifier,
];

const PROSPECTING_INDEX_UNIVERSAL_IDENTIFIERS = [
  ...getUniversalIdentifiers(STANDARD_OBJECTS.prospectingCampaign.indexes),
  ...getUniversalIdentifiers(STANDARD_OBJECTS.prospectCandidate.indexes),
];

const PROSPECTING_VIEW_UNIVERSAL_IDENTIFIERS = [
  STANDARD_OBJECTS.prospectingCampaign.views.allProspectingCampaigns
    .universalIdentifier,
  STANDARD_OBJECTS.prospectCandidate.views.allProspectCandidates
    .universalIdentifier,
];

const PROSPECTING_VIEW_FIELD_UNIVERSAL_IDENTIFIERS = [
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.prospectingCampaign.views.allProspectingCampaigns
      .viewFields,
  ),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.prospectCandidate.views.allProspectCandidates.viewFields,
  ),
];

@RegisteredWorkspaceCommand('2.33.0', 1792290000000)
@Command({
  name: 'upgrade:2-33:sync-prospecting-standard-objects',
  description:
    'Create the ProspectingCampaign and ProspectCandidate standard metadata in existing workspaces',
})
export class SyncProspectingStandardObjectsCommand extends ProvisionedWorkspaceCommandRunner {
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
      flatFieldMetadataMaps,
      flatIndexMaps,
      flatViewMaps,
      flatViewFieldMaps,
      flatCommandMenuItemMaps,
    } = await this.workspaceCacheService.getOrRecompute(workspaceId, [
      'flatObjectMetadataMaps',
      'flatFieldMetadataMaps',
      'flatIndexMaps',
      'flatViewMaps',
      'flatViewFieldMaps',
      'flatCommandMenuItemMaps',
    ]);

    const existingProspectingCampaignObjectMetadata =
      findFlatEntityByUniversalIdentifier<FlatObjectMetadata>({
        flatEntityMaps: flatObjectMetadataMaps,
        universalIdentifier:
          STANDARD_OBJECTS.prospectingCampaign.universalIdentifier,
      });

    if (isDefined(existingProspectingCampaignObjectMetadata)) {
      this.logger.log(
        `prospectingCampaign object already exists for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const now = new Date().toISOString();

    const { allFlatEntityMaps: standardAllFlatEntityMaps } =
      computeTwentyStandardApplicationAllFlatEntityMaps({
        now,
        workspaceId,
        twentyStandardApplicationId: twentyStandardFlatApplication.id,
      });

    const objectMetadatasForNavigation =
      PROSPECTING_OBJECT_METADATA_UNIVERSAL_IDENTIFIERS.map(
        (universalIdentifier) =>
          getExistingOrStandardFlatEntityOrThrow<FlatObjectMetadata>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatObjectMetadataMaps,
            existingFlatEntityMaps: flatObjectMetadataMaps,
            universalIdentifier,
          }),
      );

    const allFlatEntityOperationByMetadataName = {
      objectMetadata: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatObjectMetadata>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatObjectMetadataMaps,
            existingFlatEntityMaps: flatObjectMetadataMaps,
            universalIdentifiers:
              PROSPECTING_OBJECT_METADATA_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      fieldMetadata: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatFieldMetadata>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatFieldMetadataMaps,
            existingFlatEntityMaps: flatFieldMetadataMaps,
            universalIdentifiers:
              PROSPECTING_FIELD_METADATA_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      index: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatIndexMetadata>({
            standardFlatEntityMaps: standardAllFlatEntityMaps.flatIndexMaps,
            existingFlatEntityMaps: flatIndexMaps,
            universalIdentifiers: PROSPECTING_INDEX_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      view: {
        flatEntityToCreate: getStandardFlatEntitiesToCreateOrThrow<FlatView>({
          standardFlatEntityMaps: standardAllFlatEntityMaps.flatViewMaps,
          existingFlatEntityMaps: flatViewMaps,
          universalIdentifiers: PROSPECTING_VIEW_UNIVERSAL_IDENTIFIERS,
        }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      viewField: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatViewField>({
            standardFlatEntityMaps: standardAllFlatEntityMaps.flatViewFieldMaps,
            existingFlatEntityMaps: flatViewFieldMaps,
            universalIdentifiers: PROSPECTING_VIEW_FIELD_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      commandMenuItem: buildNavigationCommandMenuItemOperationsOrThrow({
        existingFlatCommandMenuItemMaps: flatCommandMenuItemMaps,
        objectMetadatasForNavigation,
        applicationId: twentyStandardFlatApplication.id,
        workspaceId,
        now,
        renamedCollisionObjectMetadatas: [],
      }),
    };

    const totalOperationCount = Object.values(
      allFlatEntityOperationByMetadataName,
    ).reduce(
      (total, operation) => total + operation.flatEntityToCreate.length,
      0,
    );

    if (totalOperationCount === 0) {
      this.logger.log(
        `Prospecting standard metadata already exists for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would apply ${totalOperationCount} prospecting standard metadata operations for workspace ${workspaceId}`,
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
        `Failed to create prospecting standard objects:\n${JSON.stringify(result, null, 2)}`,
      );

      throw new Error(
        `Failed to create prospecting standard objects for workspace ${workspaceId}`,
      );
    }

    this.logger.log(
      `Applied ${totalOperationCount} prospecting standard metadata operations for workspace ${workspaceId}`,
    );
  }
}
