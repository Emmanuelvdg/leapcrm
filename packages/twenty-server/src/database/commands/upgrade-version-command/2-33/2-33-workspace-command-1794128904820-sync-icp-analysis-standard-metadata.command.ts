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
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatIndexMetadata } from 'src/engine/metadata-modules/flat-index-metadata/types/flat-index-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const ICP_SCORE_FIELD_NAMES = [
  'icpScore',
  'icpTier',
  'icpScoreReasons',
  'icpCoverage',
  'icpModelVersion',
  'icpScoredAt',
] as const;

const SCORED_OBJECT_NAMES = ['company', 'prospectCandidate'] as const;

const getUniversalIdentifiers = (
  entitiesByName: Record<string, { universalIdentifier: string }>,
): string[] =>
  Object.values(entitiesByName).map((entity) => entity.universalIdentifier);

const ICP_MODEL_VIEW = STANDARD_OBJECTS.icpModel.views.allIcpModels;

@RegisteredWorkspaceCommand('2.33.0', 1794128904820)
@Command({
  name: 'upgrade:2-33:sync-icp-analysis-standard-metadata',
  description:
    'Create the ICP model object and the ICP score fields on companies and prospect candidates in existing workspaces',
})
export class SyncIcpAnalysisStandardMetadataCommand extends ProvisionedWorkspaceCommandRunner {
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

    const icpModelObjectMetadata =
      getExistingOrStandardFlatEntityOrThrow<FlatObjectMetadata>({
        standardFlatEntityMaps:
          standardAllFlatEntityMaps.flatObjectMetadataMaps,
        existingFlatEntityMaps: flatObjectMetadataMaps,
        universalIdentifier: STANDARD_OBJECTS.icpModel.universalIdentifier,
      });

    const scoreFieldUniversalIdentifiers = SCORED_OBJECT_NAMES.flatMap(
      (objectName) =>
        this.getCreatableScoreFieldUniversalIdentifiers({
          objectName,
          workspaceId,
          flatObjectMetadataMaps,
          flatFieldMetadataMaps,
        }),
    );

    const allFlatEntityOperationByMetadataName = {
      objectMetadata: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatObjectMetadata>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatObjectMetadataMaps,
            existingFlatEntityMaps: flatObjectMetadataMaps,
            universalIdentifiers: [
              STANDARD_OBJECTS.icpModel.universalIdentifier,
            ],
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
            universalIdentifiers: [
              ...getUniversalIdentifiers(STANDARD_OBJECTS.icpModel.fields),
              ...scoreFieldUniversalIdentifiers,
            ],
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      index: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatIndexMetadata>({
            standardFlatEntityMaps: standardAllFlatEntityMaps.flatIndexMaps,
            existingFlatEntityMaps: flatIndexMaps,
            universalIdentifiers: getUniversalIdentifiers(
              STANDARD_OBJECTS.icpModel.indexes,
            ),
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      view: {
        flatEntityToCreate: getStandardFlatEntitiesToCreateOrThrow<FlatView>({
          standardFlatEntityMaps: standardAllFlatEntityMaps.flatViewMaps,
          existingFlatEntityMaps: flatViewMaps,
          universalIdentifiers: [ICP_MODEL_VIEW.universalIdentifier],
        }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      viewField: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatViewField>({
            standardFlatEntityMaps: standardAllFlatEntityMaps.flatViewFieldMaps,
            existingFlatEntityMaps: flatViewFieldMaps,
            universalIdentifiers: getUniversalIdentifiers(
              ICP_MODEL_VIEW.viewFields,
            ),
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      commandMenuItem: buildNavigationCommandMenuItemOperationsOrThrow({
        existingFlatCommandMenuItemMaps: flatCommandMenuItemMaps,
        objectMetadatasForNavigation: [icpModelObjectMetadata],
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
        `ICP analysis standard metadata already exists for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would apply ${totalOperationCount} ICP analysis standard metadata operations for workspace ${workspaceId}`,
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
        `Failed to create ICP analysis standard metadata:\n${JSON.stringify(result, null, 2)}`,
      );

      throw new Error(
        `Failed to create ICP analysis standard metadata for workspace ${workspaceId}`,
      );
    }

    this.logger.log(
      `Applied ${totalOperationCount} ICP analysis standard metadata operations for workspace ${workspaceId}`,
    );
  }

  // A workspace may already have its own field with one of these names, which
  // would make the whole migration fail; that field is left alone instead.
  private getCreatableScoreFieldUniversalIdentifiers({
    objectName,
    workspaceId,
    flatObjectMetadataMaps,
    flatFieldMetadataMaps,
  }: {
    objectName: (typeof SCORED_OBJECT_NAMES)[number];
    workspaceId: string;
    flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
    flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  }): string[] {
    const objectMetadata =
      findFlatEntityByUniversalIdentifier<FlatObjectMetadata>({
        flatEntityMaps: flatObjectMetadataMaps,
        universalIdentifier: STANDARD_OBJECTS[objectName].universalIdentifier,
      });

    if (!isDefined(objectMetadata)) {
      this.logger.warn(
        `${objectName} object not found for workspace ${workspaceId}, skipping its ICP score fields`,
      );

      return [];
    }

    const existingFieldsByName = new Map(
      Object.values(flatFieldMetadataMaps.byUniversalIdentifier)
        .filter(
          (flatFieldMetadata): flatFieldMetadata is FlatFieldMetadata =>
            isDefined(flatFieldMetadata) &&
            flatFieldMetadata.objectMetadataId === objectMetadata.id,
        )
        .map((flatFieldMetadata) => [
          flatFieldMetadata.name,
          flatFieldMetadata,
        ]),
    );

    return ICP_SCORE_FIELD_NAMES.flatMap((fieldName) => {
      const universalIdentifier =
        STANDARD_OBJECTS[objectName].fields[fieldName].universalIdentifier;
      const existingField = existingFieldsByName.get(fieldName);

      if (
        isDefined(existingField) &&
        existingField.universalIdentifier !== universalIdentifier
      ) {
        this.logger.warn(
          `${objectName} already has a custom ${fieldName} field for workspace ${workspaceId}, not creating the standard one`,
        );

        return [];
      }

      return [universalIdentifier];
    });
  }
}
