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
import { type FlatCommandMenuItem } from 'src/engine/metadata-modules/flat-command-menu-item/types/flat-command-menu-item.type';
import { type SyncableFlatEntity } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-from.type';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatIndexMetadata } from 'src/engine/metadata-modules/flat-index-metadata/types/flat-index-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type FlatPageLayoutTab } from 'src/engine/metadata-modules/flat-page-layout-tab/types/flat-page-layout-tab.type';
import { type FlatPageLayoutWidget } from 'src/engine/metadata-modules/flat-page-layout-widget/types/flat-page-layout-widget.type';
import { type FlatPageLayout } from 'src/engine/metadata-modules/flat-page-layout/types/flat-page-layout.type';
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { STANDARD_COMMAND_MENU_ITEMS } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-command-menu-item.constant';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const { callRecording, person, company, opportunity } = STANDARD_OBJECTS;

const {
  personRecordPage,
  companyRecordPage,
  opportunityRecordPage,
  callRecordingRecordPage,
} = STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS;

const FIELD_UNIVERSAL_IDENTIFIERS = [
  callRecording.fields.person.universalIdentifier,
  callRecording.fields.company.universalIdentifier,
  callRecording.fields.opportunity.universalIdentifier,
  person.fields.callRecordings.universalIdentifier,
  company.fields.callRecordings.universalIdentifier,
  opportunity.fields.callRecordings.universalIdentifier,
];

const INDEX_UNIVERSAL_IDENTIFIERS = [
  callRecording.indexes.personIdIndex.universalIdentifier,
  callRecording.indexes.companyIdIndex.universalIdentifier,
  callRecording.indexes.opportunityIdIndex.universalIdentifier,
];

const RECORD_PAGE_FIELDS_VIEW =
  callRecording.views.callRecordingRecordPageFields;

const VIEW_FIELD_UNIVERSAL_IDENTIFIERS = [
  RECORD_PAGE_FIELDS_VIEW.viewFields.person.universalIdentifier,
  RECORD_PAGE_FIELDS_VIEW.viewFields.company.universalIdentifier,
  RECORD_PAGE_FIELDS_VIEW.viewFields.opportunity.universalIdentifier,
];

const TRANSCRIPT_TAB_UNIVERSAL_IDENTIFIER =
  callRecordingRecordPage.tabs.transcript.universalIdentifier;

// Each widget is only added when its tab exists, since users can delete tabs.
const WIDGETS_BY_TAB_UNIVERSAL_IDENTIFIER: Record<string, string> = {
  [personRecordPage.tabs.home.widgets.callRecordings.universalIdentifier]:
    personRecordPage.tabs.home.universalIdentifier,
  [companyRecordPage.tabs.home.widgets.callRecordings.universalIdentifier]:
    companyRecordPage.tabs.home.universalIdentifier,
  [opportunityRecordPage.tabs.home.widgets.callRecordings.universalIdentifier]:
    opportunityRecordPage.tabs.home.universalIdentifier,
  [callRecordingRecordPage.tabs.transcript.widgets.transcript
    .universalIdentifier]: TRANSCRIPT_TAB_UNIVERSAL_IDENTIFIER,
};

const exists = <TEntity extends SyncableFlatEntity>(
  flatEntityMaps: FlatEntityMaps<TEntity>,
  universalIdentifier: string,
) =>
  isDefined(
    findFlatEntityByUniversalIdentifier<TEntity>({
      flatEntityMaps,
      universalIdentifier,
    }),
  );

@RegisteredWorkspaceCommand('2.33.0', 1795145009176)
@Command({
  name: 'upgrade:2-33:add-in-app-call-recording',
  description:
    'Links call recordings to people, companies and opportunities, and adds the Record meeting action, the Call Recordings widgets and the recording transcript tab to existing workspaces',
})
export class AddInAppCallRecordingCommand extends ProvisionedWorkspaceCommandRunner {
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
      flatPageLayoutMaps,
      flatPageLayoutTabMaps,
      flatPageLayoutWidgetMaps,
      flatCommandMenuItemMaps,
    } = await this.workspaceCacheService.getOrRecompute(workspaceId, [
      'flatObjectMetadataMaps',
      'flatFieldMetadataMaps',
      'flatIndexMaps',
      'flatViewMaps',
      'flatViewFieldMaps',
      'flatPageLayoutMaps',
      'flatPageLayoutTabMaps',
      'flatPageLayoutWidgetMaps',
      'flatCommandMenuItemMaps',
    ]);

    if (
      !exists<FlatObjectMetadata>(
        flatObjectMetadataMaps,
        callRecording.universalIdentifier,
      )
    ) {
      this.logger.log(
        `Call recording object missing for workspace ${workspaceId}, skipping`,
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

    const isTranscriptTabCreatable = exists<FlatPageLayout>(
      flatPageLayoutMaps,
      callRecordingRecordPage.universalIdentifier,
    );

    const pageLayoutTabsToCreate = isTranscriptTabCreatable
      ? getStandardFlatEntitiesToCreateOrThrow<FlatPageLayoutTab>({
          standardFlatEntityMaps:
            standardAllFlatEntityMaps.flatPageLayoutTabMaps,
          existingFlatEntityMaps: flatPageLayoutTabMaps,
          universalIdentifiers: [TRANSCRIPT_TAB_UNIVERSAL_IDENTIFIER],
        })
      : [];

    const widgetUniversalIdentifiers = Object.entries(
      WIDGETS_BY_TAB_UNIVERSAL_IDENTIFIER,
    )
      .filter(
        ([, tabUniversalIdentifier]) =>
          exists<FlatPageLayoutTab>(
            flatPageLayoutTabMaps,
            tabUniversalIdentifier,
          ) ||
          pageLayoutTabsToCreate.some(
            (tab) => tab.universalIdentifier === tabUniversalIdentifier,
          ),
      )
      .map(([widgetUniversalIdentifier]) => widgetUniversalIdentifier);

    const isRecordPageFieldsViewPresent = exists<FlatView>(
      flatViewMaps,
      RECORD_PAGE_FIELDS_VIEW.universalIdentifier,
    );

    const allFlatEntityOperationByMetadataName = {
      fieldMetadata: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatFieldMetadata>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatFieldMetadataMaps,
            existingFlatEntityMaps: flatFieldMetadataMaps,
            universalIdentifiers: FIELD_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      index: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatIndexMetadata>({
            standardFlatEntityMaps: standardAllFlatEntityMaps.flatIndexMaps,
            existingFlatEntityMaps: flatIndexMaps,
            universalIdentifiers: INDEX_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      viewField: {
        flatEntityToCreate: isRecordPageFieldsViewPresent
          ? getStandardFlatEntitiesToCreateOrThrow<FlatViewField>({
              standardFlatEntityMaps:
                standardAllFlatEntityMaps.flatViewFieldMaps,
              existingFlatEntityMaps: flatViewFieldMaps,
              universalIdentifiers: VIEW_FIELD_UNIVERSAL_IDENTIFIERS,
            })
          : [],
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      pageLayoutTab: {
        flatEntityToCreate: pageLayoutTabsToCreate,
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      pageLayoutWidget: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatPageLayoutWidget>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatPageLayoutWidgetMaps,
            existingFlatEntityMaps: flatPageLayoutWidgetMaps,
            universalIdentifiers: widgetUniversalIdentifiers,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      commandMenuItem: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatCommandMenuItem>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatCommandMenuItemMaps,
            existingFlatEntityMaps: flatCommandMenuItemMaps,
            universalIdentifiers: [
              STANDARD_COMMAND_MENU_ITEMS.recordMeeting.universalIdentifier,
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
        `In-app call recording already set up for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would apply ${totalOperationCount} in-app call recording operations for workspace ${workspaceId}`,
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
        `Failed to add in-app call recording:\n${JSON.stringify(result, null, 2)}`,
      );

      throw new Error(
        `Failed to add in-app call recording for workspace ${workspaceId}`,
      );
    }

    this.logger.log(
      `Applied ${totalOperationCount} in-app call recording operations for workspace ${workspaceId}`,
    );
  }
}
