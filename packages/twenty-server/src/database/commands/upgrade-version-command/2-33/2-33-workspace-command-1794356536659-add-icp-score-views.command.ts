import { Command } from 'nest-commander';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { getStandardFlatEntitiesToCreateOrThrow } from 'src/database/commands/upgrade-version-command/2-10/utils/get-standard-flat-entities-to-create-or-throw.util';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { type FlatViewFieldGroup } from 'src/engine/metadata-modules/flat-view-field-group/types/flat-view-field-group.type';
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import { type FlatViewFilter } from 'src/engine/metadata-modules/flat-view-filter/types/flat-view-filter.type';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const { priorityAccounts, companyRecordPageFields } =
  STANDARD_OBJECTS.company.views;
const { allProspectCandidates } = STANDARD_OBJECTS.prospectCandidate.views;

const getUniversalIdentifiers = (
  entitiesByName: Record<string, { universalIdentifier: string }>,
): string[] =>
  Object.values(entitiesByName).map(
    ({ universalIdentifier }) => universalIdentifier,
  );

const COMPANY_RECORD_PAGE_ICP_FIELD_UNIVERSAL_IDENTIFIERS = [
  companyRecordPageFields.viewFields.icpTier,
  companyRecordPageFields.viewFields.icpScore,
  companyRecordPageFields.viewFields.icpCoverage,
  companyRecordPageFields.viewFields.icpScoreReasons,
  companyRecordPageFields.viewFields.icpModelVersion,
  companyRecordPageFields.viewFields.icpScoredAt,
].map(({ universalIdentifier }) => universalIdentifier);

const CANDIDATE_LIST_ICP_FIELD_UNIVERSAL_IDENTIFIERS = [
  allProspectCandidates.viewFields.icpTier,
  allProspectCandidates.viewFields.icpScore,
].map(({ universalIdentifier }) => universalIdentifier);

// Runs after the ICP analysis metadata sync, which created the score fields
// these views show. Parts whose view a workspace no longer has are skipped.
@RegisteredWorkspaceCommand('2.33.0', 1794356536659)
@Command({
  name: 'upgrade:2-33:add-icp-score-views',
  description:
    'Adds the Priority accounts view, the ICP fit group on company record pages and score columns on the candidate list to existing workspaces',
})
export class AddIcpScoreViewsCommand extends ProvisionedWorkspaceCommandRunner {
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
      flatViewFieldMaps,
      flatViewFieldGroupMaps,
      flatViewFilterMaps,
    } = await this.workspaceCacheService.getOrRecompute(workspaceId, [
      'flatFieldMetadataMaps',
      'flatViewMaps',
      'flatViewFieldMaps',
      'flatViewFieldGroupMaps',
      'flatViewFilterMaps',
    ]);

    const hasScoreFields = isDefined(
      flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.company.fields.icpTier.universalIdentifier
      ],
    );

    if (!hasScoreFields) {
      this.logger.log(
        `ICP score fields missing for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    const hasCompanyRecordPageFieldsView = isDefined(
      flatViewMaps.byUniversalIdentifier[
        companyRecordPageFields.universalIdentifier
      ],
    );
    const hasCandidateListView = isDefined(
      flatViewMaps.byUniversalIdentifier[
        allProspectCandidates.universalIdentifier
      ],
    );

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
      view: {
        flatEntityToCreate: getStandardFlatEntitiesToCreateOrThrow<FlatView>({
          standardFlatEntityMaps: standardAllFlatEntityMaps.flatViewMaps,
          existingFlatEntityMaps: flatViewMaps,
          universalIdentifiers: [priorityAccounts.universalIdentifier],
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
            universalIdentifiers: hasCompanyRecordPageFieldsView
              ? [companyRecordPageFields.viewFieldGroups.icpFit.universalIdentifier]
              : [],
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      viewField: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatViewField>({
            standardFlatEntityMaps: standardAllFlatEntityMaps.flatViewFieldMaps,
            existingFlatEntityMaps: flatViewFieldMaps,
            universalIdentifiers: [
              ...getUniversalIdentifiers(priorityAccounts.viewFields),
              ...(hasCompanyRecordPageFieldsView
                ? COMPANY_RECORD_PAGE_ICP_FIELD_UNIVERSAL_IDENTIFIERS
                : []),
              ...(hasCandidateListView
                ? CANDIDATE_LIST_ICP_FIELD_UNIVERSAL_IDENTIFIERS
                : []),
            ],
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      viewFilter: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatViewFilter>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatViewFilterMaps,
            existingFlatEntityMaps: flatViewFilterMaps,
            universalIdentifiers: getUniversalIdentifiers(
              priorityAccounts.viewFilters,
            ),
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
        `ICP score views already exist for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would apply ${totalOperationCount} ICP score view operations for workspace ${workspaceId}`,
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
        `Failed to add the ICP score views:\n${JSON.stringify(result, null, 2)}`,
      );

      throw new Error(
        `Failed to add the ICP score views for workspace ${workspaceId}`,
      );
    }

    this.logger.log(
      `Applied ${totalOperationCount} ICP score view operations for workspace ${workspaceId}`,
    );
  }
}
