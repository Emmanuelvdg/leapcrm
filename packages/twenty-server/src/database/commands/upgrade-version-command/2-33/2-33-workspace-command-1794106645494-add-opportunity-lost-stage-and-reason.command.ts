import { Command } from 'nest-commander';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { type SyncableFlatEntity } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-from.type';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { isEnumFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-enum-flat-field-metadata.util';
import { recomputeViewGroupsOnFlatFieldMetadataOptionsUpdate } from 'src/engine/metadata-modules/flat-field-metadata/utils/recompute-view-groups-on-flat-field-metadata-options-update.util';
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import { type FlatViewGroup } from 'src/engine/metadata-modules/flat-view-group/types/flat-view-group.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const LOST_STAGE_VALUE = 'LOST';

const STAGE_FIELD_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.opportunity.fields.stage.universalIdentifier;

const LOST_REASON_FIELD_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.opportunity.fields.lostReason.universalIdentifier;

const BY_STAGE_VIEW_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.opportunity.views.byStage.universalIdentifier;

const BY_STAGE_LOST_VIEW_GROUP_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.opportunity.views.byStage.viewGroups.lost
    .universalIdentifier;

const LOST_REASON_RECORD_PAGE_VIEW_FIELD_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.opportunity.views.opportunityRecordPageFields.viewFields
    .lostReason.universalIdentifier;

const hasLostStageOption = (stageField: FlatFieldMetadata): boolean =>
  (stageField.options ?? []).some(
    (option) =>
      option.value === LOST_STAGE_VALUE ||
      option.label.trim().toLowerCase() === 'lost',
  );

const getStandardEntityOrThrow = <TEntity extends SyncableFlatEntity>(
  flatEntityMaps: FlatEntityMaps<TEntity>,
  universalIdentifier: string,
): TEntity => {
  const standardEntity =
    flatEntityMaps.byUniversalIdentifier[universalIdentifier];

  if (!isDefined(standardEntity)) {
    throw new Error(`Could not find standard entity ${universalIdentifier}`);
  }

  return standardEntity;
};

@RegisteredWorkspaceCommand('2.33.0', 1794106645494)
@Command({
  name: 'upgrade:2-33:add-opportunity-lost-stage-and-reason',
  description:
    'Add the Lost stage, its kanban column and the Lost reason field to opportunities in existing workspaces',
})
export class AddOpportunityLostStageAndReasonCommand extends ProvisionedWorkspaceCommandRunner {
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
      flatFieldMetadataMaps,
      flatViewMaps,
      flatViewGroupMaps,
      flatViewFieldMaps,
      flatViewFieldGroupMaps,
    } = await this.workspaceCacheService.getOrRecompute(workspaceId, [
      'flatFieldMetadataMaps',
      'flatViewMaps',
      'flatViewGroupMaps',
      'flatViewFieldMaps',
      'flatViewFieldGroupMaps',
    ]);

    const existingStageField =
      findFlatEntityByUniversalIdentifier<FlatFieldMetadata>({
        flatEntityMaps: flatFieldMetadataMaps,
        universalIdentifier: STAGE_FIELD_UNIVERSAL_IDENTIFIER,
      });

    if (
      !isDefined(existingStageField) ||
      !isEnumFlatFieldMetadata(existingStageField)
    ) {
      this.logger.warn(
        `Opportunity stage field not found for workspace ${workspaceId}, skipping`,
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

    const fieldMetadatasToUpdate: FlatFieldMetadata[] = [];
    const viewGroupsToCreate: FlatViewGroup[] = [];

    if (hasLostStageOption(existingStageField)) {
      this.logger.log(
        `Opportunity stage already has a Lost option for workspace ${workspaceId}, keeping it`,
      );
    } else {
      const standardStageField = getStandardEntityOrThrow<FlatFieldMetadata>(
        standardAllFlatEntityMaps.flatFieldMetadataMaps,
        STAGE_FIELD_UNIVERSAL_IDENTIFIER,
      );

      const standardLostOption = (standardStageField.options ?? []).find(
        (option) => option.value === LOST_STAGE_VALUE,
      );

      if (!isDefined(standardLostOption)) {
        throw new Error('Standard opportunity stage has no Lost option');
      }

      const existingOptions = existingStageField.options ?? [];

      const nextPosition =
        Math.max(-1, ...existingOptions.map((option) => option.position)) + 1;

      const toOptions = [
        ...existingOptions,
        { ...standardLostOption, position: nextPosition },
      ];

      fieldMetadatasToUpdate.push({
        ...existingStageField,
        options: toOptions,
      });

      const { flatViewGroupsToCreate } =
        recomputeViewGroupsOnFlatFieldMetadataOptionsUpdate({
          fromFlatFieldMetadata: existingStageField,
          toOptions,
          flatViewMaps,
          flatViewGroupMaps,
        });

      // Keep the standard identifier on the standard kanban so fresh and
      // upgraded workspaces stay comparable.
      viewGroupsToCreate.push(
        ...flatViewGroupsToCreate.map((flatViewGroup) =>
          flatViewGroup.viewUniversalIdentifier ===
          BY_STAGE_VIEW_UNIVERSAL_IDENTIFIER
            ? {
                ...flatViewGroup,
                universalIdentifier:
                  BY_STAGE_LOST_VIEW_GROUP_UNIVERSAL_IDENTIFIER,
              }
            : flatViewGroup,
        ),
      );
    }

    const fieldMetadatasToCreate: FlatFieldMetadata[] = [];
    const viewFieldsToCreate: FlatViewField[] = [];

    const existingLostReasonField =
      findFlatEntityByUniversalIdentifier<FlatFieldMetadata>({
        flatEntityMaps: flatFieldMetadataMaps,
        universalIdentifier: LOST_REASON_FIELD_UNIVERSAL_IDENTIFIER,
      });

    const conflictingLostReasonField = Object.values(
      flatFieldMetadataMaps.byUniversalIdentifier,
    ).find(
      (flatFieldMetadata) =>
        isDefined(flatFieldMetadata) &&
        flatFieldMetadata.objectMetadataId ===
          existingStageField.objectMetadataId &&
        flatFieldMetadata.name === 'lostReason' &&
        flatFieldMetadata.universalIdentifier !==
          LOST_REASON_FIELD_UNIVERSAL_IDENTIFIER,
    );

    if (isDefined(conflictingLostReasonField)) {
      this.logger.warn(
        `Opportunity already has a custom lostReason field for workspace ${workspaceId}, not creating the standard one`,
      );
    } else if (!isDefined(existingLostReasonField)) {
      fieldMetadatasToCreate.push(
        getStandardEntityOrThrow<FlatFieldMetadata>(
          standardAllFlatEntityMaps.flatFieldMetadataMaps,
          LOST_REASON_FIELD_UNIVERSAL_IDENTIFIER,
        ),
      );

      const standardLostReasonViewField =
        getStandardEntityOrThrow<FlatViewField>(
          standardAllFlatEntityMaps.flatViewFieldMaps,
          LOST_REASON_RECORD_PAGE_VIEW_FIELD_UNIVERSAL_IDENTIFIER,
        );

      const hasRecordPageFieldsView = isDefined(
        flatViewMaps.byUniversalIdentifier[
          standardLostReasonViewField.viewUniversalIdentifier
        ],
      );

      const viewFieldGroupUniversalIdentifier =
        standardLostReasonViewField.viewFieldGroupUniversalIdentifier;

      const hasViewFieldGroup =
        !isDefined(viewFieldGroupUniversalIdentifier) ||
        isDefined(
          flatViewFieldGroupMaps.byUniversalIdentifier[
            viewFieldGroupUniversalIdentifier
          ],
        );

      const hasViewField = isDefined(
        flatViewFieldMaps.byUniversalIdentifier[
          LOST_REASON_RECORD_PAGE_VIEW_FIELD_UNIVERSAL_IDENTIFIER
        ],
      );

      if (hasRecordPageFieldsView && hasViewFieldGroup && !hasViewField) {
        viewFieldsToCreate.push(standardLostReasonViewField);
      }
    }

    const totalOperationCount =
      fieldMetadatasToUpdate.length +
      fieldMetadatasToCreate.length +
      viewGroupsToCreate.length +
      viewFieldsToCreate.length;

    if (totalOperationCount === 0) {
      this.logger.log(
        `Opportunity Lost stage and reason already exist for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would apply ${totalOperationCount} opportunity Lost stage and reason operations for workspace ${workspaceId}`,
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
          allFlatEntityOperationByMetadataName: {
            fieldMetadata: {
              flatEntityToCreate: fieldMetadatasToCreate,
              flatEntityToDelete: [],
              flatEntityToUpdate: fieldMetadatasToUpdate,
            },
            viewGroup: {
              flatEntityToCreate: viewGroupsToCreate,
              flatEntityToDelete: [],
              flatEntityToUpdate: [],
            },
            viewField: {
              flatEntityToCreate: viewFieldsToCreate,
              flatEntityToDelete: [],
              flatEntityToUpdate: [],
            },
          },
        },
      );

    if (result.status === 'fail') {
      this.logger.error(
        `Failed to add opportunity Lost stage and reason:\n${JSON.stringify(result, null, 2)}`,
      );

      throw new Error(
        `Failed to add opportunity Lost stage and reason for workspace ${workspaceId}`,
      );
    }

    this.logger.log(
      `Applied ${totalOperationCount} opportunity Lost stage and reason operations for workspace ${workspaceId}`,
    );
  }
}
