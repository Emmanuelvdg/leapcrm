import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { isDefined } from 'twenty-shared/utils';

import { type WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { AddOpportunityLostStageAndReasonCommand } from 'src/database/commands/upgrade-version-command/2-33/2-33-workspace-command-1794106645494-add-opportunity-lost-stage-and-reason.command';
import { type ApplicationService } from 'src/engine/core-modules/application/application.service';
import { type AllFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/all-flat-entity-maps.type';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import { type FlatViewGroup } from 'src/engine/metadata-modules/flat-view-group/types/flat-view-group.type';
import { type WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { type WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const WORKSPACE_ID = '20202020-0000-0000-0000-000000000001';
const STANDARD_APPLICATION_ID = '20202020-0000-0000-0000-0000000000b1';

const OPPORTUNITY = STANDARD_OBJECTS.opportunity;
const STAGE_FIELD_UNIVERSAL_IDENTIFIER =
  OPPORTUNITY.fields.stage.universalIdentifier;
const LOST_REASON_FIELD_UNIVERSAL_IDENTIFIER =
  OPPORTUNITY.fields.lostReason.universalIdentifier;
const BY_STAGE_LOST_VIEW_GROUP_UNIVERSAL_IDENTIFIER =
  OPPORTUNITY.views.byStage.viewGroups.lost.universalIdentifier;
const LOST_REASON_VIEW_FIELD_UNIVERSAL_IDENTIFIER =
  OPPORTUNITY.views.opportunityRecordPageFields.viewFields.lostReason
    .universalIdentifier;

type WorkspaceFlatEntityMaps = Pick<
  AllFlatEntityMaps,
  | 'flatFieldMetadataMaps'
  | 'flatViewMaps'
  | 'flatViewGroupMaps'
  | 'flatViewFieldMaps'
  | 'flatViewFieldGroupMaps'
>;

type StageOption = NonNullable<FlatFieldMetadata['options']>[number];

// The standard builder leaves the one-to-many id arrays empty; a workspace
// cache fills them from the database, and the kanban recompute relies on them.
const linkStageKanbanViews = (
  flatEntityMaps: WorkspaceFlatEntityMaps,
): WorkspaceFlatEntityMaps => {
  const stageField = getStageField(flatEntityMaps);
  const flatViews = Object.values(
    flatEntityMaps.flatViewMaps.byUniversalIdentifier,
  ).filter(isDefined);
  const flatViewGroups = Object.values(
    flatEntityMaps.flatViewGroupMaps.byUniversalIdentifier,
  ).filter(isDefined);

  const stageKanbanViews = flatViews.filter(
    (flatView) => flatView.mainGroupByFieldMetadataId === stageField.id,
  );

  return {
    ...flatEntityMaps,
    flatFieldMetadataMaps: withEntity(
      flatEntityMaps.flatFieldMetadataMaps,
      STAGE_FIELD_UNIVERSAL_IDENTIFIER,
      {
        ...stageField,
        mainGroupByFieldMetadataViewIds: stageKanbanViews.map(({ id }) => id),
      },
    ),
    flatViewMaps: stageKanbanViews.reduce(
      (flatViewMaps, flatView) =>
        withEntity(flatViewMaps, flatView.universalIdentifier, {
          ...flatView,
          viewGroupIds: flatViewGroups
            .filter((flatViewGroup) => flatViewGroup.viewId === flatView.id)
            .map(({ id }) => id),
        }),
      flatEntityMaps.flatViewMaps,
    ),
  };
};

const computeStandardFlatEntityMaps = (): WorkspaceFlatEntityMaps =>
  linkStageKanbanViews(
    computeTwentyStandardApplicationAllFlatEntityMaps({
      now: new Date().toISOString(),
      workspaceId: WORKSPACE_ID,
      twentyStandardApplicationId: STANDARD_APPLICATION_ID,
    }).allFlatEntityMaps,
  );

const withoutEntity = <TMaps extends { byUniversalIdentifier: object }>(
  flatEntityMaps: TMaps,
  universalIdentifier: string,
): TMaps => {
  const byUniversalIdentifier: Record<string, unknown> = {
    ...flatEntityMaps.byUniversalIdentifier,
  };

  delete byUniversalIdentifier[universalIdentifier];

  return { ...flatEntityMaps, byUniversalIdentifier };
};

const withEntity = <TMaps extends { byUniversalIdentifier: object }>(
  flatEntityMaps: TMaps,
  universalIdentifier: string,
  entity: unknown,
): TMaps => ({
  ...flatEntityMaps,
  byUniversalIdentifier: {
    ...flatEntityMaps.byUniversalIdentifier,
    [universalIdentifier]: entity,
  },
});

const getStageField = (
  flatEntityMaps: WorkspaceFlatEntityMaps,
): FlatFieldMetadata => {
  const stageField =
    flatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
      STAGE_FIELD_UNIVERSAL_IDENTIFIER
    ];

  if (!isDefined(stageField)) {
    throw new Error('Standard stage field missing');
  }

  return stageField;
};

// A workspace created before the Lost stage existed: no LOST option, no Lost
// kanban column, no lostReason field and no record page entry for it.
const buildPreUpgradeFlatEntityMaps = ({
  stageOptions,
}: {
  stageOptions?: (standardOptions: StageOption[]) => StageOption[];
} = {}): WorkspaceFlatEntityMaps => {
  const standardFlatEntityMaps = computeStandardFlatEntityMaps();
  const standardStageField = getStageField(standardFlatEntityMaps);

  const optionsWithoutLost = (standardStageField.options ?? []).filter(
    (option) => option.value !== 'LOST',
  );

  const lostViewGroup =
    standardFlatEntityMaps.flatViewGroupMaps.byUniversalIdentifier[
      BY_STAGE_LOST_VIEW_GROUP_UNIVERSAL_IDENTIFIER
    ];

  const byStageView =
    standardFlatEntityMaps.flatViewMaps.byUniversalIdentifier[
      OPPORTUNITY.views.byStage.universalIdentifier
    ];

  if (!isDefined(lostViewGroup) || !isDefined(byStageView)) {
    throw new Error('Standard Lost view group or By stage view missing');
  }

  return {
    flatFieldMetadataMaps: withoutEntity(
      withEntity(
        standardFlatEntityMaps.flatFieldMetadataMaps,
        STAGE_FIELD_UNIVERSAL_IDENTIFIER,
        {
          ...standardStageField,
          options: stageOptions?.(optionsWithoutLost) ?? optionsWithoutLost,
        },
      ),
      LOST_REASON_FIELD_UNIVERSAL_IDENTIFIER,
    ),
    flatViewMaps: withEntity(
      standardFlatEntityMaps.flatViewMaps,
      byStageView.universalIdentifier,
      {
        ...byStageView,
        viewGroupIds: byStageView.viewGroupIds.filter(
          (viewGroupId) => viewGroupId !== lostViewGroup.id,
        ),
      },
    ),
    flatViewGroupMaps: withoutEntity(
      standardFlatEntityMaps.flatViewGroupMaps,
      BY_STAGE_LOST_VIEW_GROUP_UNIVERSAL_IDENTIFIER,
    ),
    flatViewFieldMaps: withoutEntity(
      standardFlatEntityMaps.flatViewFieldMaps,
      LOST_REASON_VIEW_FIELD_UNIVERSAL_IDENTIFIER,
    ),
    flatViewFieldGroupMaps: standardFlatEntityMaps.flatViewFieldGroupMaps,
  };
};

describe('AddOpportunityLostStageAndReasonCommand', () => {
  let command: AddOpportunityLostStageAndReasonCommand;
  let getOrRecompute: jest.Mock;
  let validateBuildAndRunLegacyWorkspaceMigration: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    getOrRecompute = jest.fn();
    validateBuildAndRunLegacyWorkspaceMigration = jest
      .fn()
      .mockResolvedValue({ status: 'success' });

    const applicationService = {
      findWorkspaceTwentyStandardAndCustomApplicationOrThrow: jest
        .fn()
        .mockResolvedValue({
          twentyStandardFlatApplication: {
            id: STANDARD_APPLICATION_ID,
            universalIdentifier: STANDARD_APPLICATION_ID,
          },
        }),
    } as unknown as ApplicationService;

    command = new AddOpportunityLostStageAndReasonCommand(
      {} as WorkspaceIteratorService,
      applicationService,
      { getOrRecompute } as unknown as WorkspaceCacheService,
      {
        validateBuildAndRunLegacyWorkspaceMigration,
      } as unknown as WorkspaceMigrationValidateBuildAndRunService,
    );

    jest.spyOn(command['logger'], 'log').mockImplementation();
    jest.spyOn(command['logger'], 'warn').mockImplementation();
    jest.spyOn(command['logger'], 'error').mockImplementation();
  });

  const runOnWorkspace = (dryRun = false) =>
    command.runOnWorkspace({
      workspaceId: WORKSPACE_ID,
      options: { dryRun },
      index: 0,
      total: 1,
    });

  const getAppliedOperations = () => {
    expect(validateBuildAndRunLegacyWorkspaceMigration).toHaveBeenCalledTimes(
      1,
    );

    const [{ allFlatEntityOperationByMetadataName }] =
      validateBuildAndRunLegacyWorkspaceMigration.mock.calls[0];

    return {
      fieldsToCreate: allFlatEntityOperationByMetadataName.fieldMetadata
        .flatEntityToCreate as FlatFieldMetadata[],
      fieldsToUpdate: allFlatEntityOperationByMetadataName.fieldMetadata
        .flatEntityToUpdate as FlatFieldMetadata[],
      viewGroupsToCreate: allFlatEntityOperationByMetadataName.viewGroup
        .flatEntityToCreate as FlatViewGroup[],
      viewFieldsToCreate: allFlatEntityOperationByMetadataName.viewField
        .flatEntityToCreate as FlatViewField[],
    };
  };

  it('adds the Lost stage, its kanban column, the Lost reason field and its record page entry', async () => {
    getOrRecompute.mockResolvedValue(buildPreUpgradeFlatEntityMaps());

    await runOnWorkspace();

    const {
      fieldsToCreate,
      fieldsToUpdate,
      viewGroupsToCreate,
      viewFieldsToCreate,
    } = getAppliedOperations();

    expect(fieldsToUpdate).toHaveLength(1);
    expect(
      fieldsToUpdate[0].options?.map(({ value, position }) => ({
        value,
        position,
      })),
    ).toEqual([
      { value: 'NEW', position: 0 },
      { value: 'SCREENING', position: 1 },
      { value: 'MEETING', position: 2 },
      { value: 'PROPOSAL', position: 3 },
      { value: 'CUSTOMER', position: 4 },
      { value: 'LOST', position: 5 },
    ]);

    expect(viewGroupsToCreate).toHaveLength(1);
    expect(viewGroupsToCreate[0]).toMatchObject({
      fieldValue: 'LOST',
      universalIdentifier: BY_STAGE_LOST_VIEW_GROUP_UNIVERSAL_IDENTIFIER,
    });

    expect(fieldsToCreate.map(({ name }) => name)).toEqual(['lostReason']);
    expect(fieldsToCreate[0].options?.map(({ value }) => value)).toEqual([
      'PRICE',
      'COMPETITOR',
      'NO_DECISION',
      'TIMING',
      'BAD_FIT',
      'OTHER',
    ]);

    expect(
      viewFieldsToCreate.map(({ universalIdentifier }) => universalIdentifier),
    ).toEqual([LOST_REASON_VIEW_FIELD_UNIVERSAL_IDENTIFIER]);
  });

  it('appends Lost after the last option when the workspace customised its stages', async () => {
    getOrRecompute.mockResolvedValue(
      buildPreUpgradeFlatEntityMaps({
        stageOptions: (standardOptions) => [
          ...standardOptions.filter((option) => option.value !== 'SCREENING'),
          {
            id: '6a1f1d0e-5a52-4a83-9a40-5e0a7b7a7a01',
            value: 'NEGOTIATION',
            label: 'Negotiation',
            position: 9,
            color: 'pink',
          },
        ],
      }),
    );

    await runOnWorkspace();

    const { fieldsToUpdate } = getAppliedOperations();

    expect(
      fieldsToUpdate[0].options?.map(({ value, position }) => ({
        value,
        position,
      })),
    ).toEqual([
      { value: 'NEW', position: 0 },
      { value: 'MEETING', position: 2 },
      { value: 'PROPOSAL', position: 3 },
      { value: 'CUSTOMER', position: 4 },
      { value: 'NEGOTIATION', position: 9 },
      { value: 'LOST', position: 10 },
    ]);
  });

  it.each([
    ['a LOST value', { value: 'LOST', label: 'Closed lost' }],
    ['a Lost label', { value: 'CLOSED_LOST', label: 'Lost' }],
  ])(
    'keeps the stage options untouched when the workspace already has %s',
    async (_, { value, label }) => {
      getOrRecompute.mockResolvedValue(
        buildPreUpgradeFlatEntityMaps({
          stageOptions: (standardOptions) => [
            ...standardOptions,
            {
              id: '6a1f1d0e-5a52-4a83-9a40-5e0a7b7a7a02',
              value,
              label,
              position: 5,
              color: 'gray',
            },
          ],
        }),
      );

      await runOnWorkspace();

      const { fieldsToCreate, fieldsToUpdate, viewGroupsToCreate } =
        getAppliedOperations();

      expect(fieldsToUpdate).toEqual([]);
      expect(viewGroupsToCreate).toEqual([]);
      expect(fieldsToCreate.map(({ name }) => name)).toEqual(['lostReason']);
    },
  );

  it('does not create the standard Lost reason when a custom lostReason field exists', async () => {
    const preUpgradeFlatEntityMaps = buildPreUpgradeFlatEntityMaps();
    const stageField = getStageField(preUpgradeFlatEntityMaps);
    const customLostReasonUniversalIdentifier =
      '6a1f1d0e-5a52-4a83-9a40-5e0a7b7a7a03';

    getOrRecompute.mockResolvedValue({
      ...preUpgradeFlatEntityMaps,
      flatFieldMetadataMaps: withEntity(
        preUpgradeFlatEntityMaps.flatFieldMetadataMaps,
        customLostReasonUniversalIdentifier,
        {
          ...stageField,
          id: customLostReasonUniversalIdentifier,
          universalIdentifier: customLostReasonUniversalIdentifier,
          name: 'lostReason',
        },
      ),
    });

    await runOnWorkspace();

    const { fieldsToCreate, fieldsToUpdate, viewFieldsToCreate } =
      getAppliedOperations();

    expect(fieldsToUpdate).toHaveLength(1);
    expect(fieldsToCreate).toEqual([]);
    expect(viewFieldsToCreate).toEqual([]);
  });

  it('does nothing when the workspace is already up to date', async () => {
    getOrRecompute.mockResolvedValue(computeStandardFlatEntityMaps());

    await runOnWorkspace();

    expect(validateBuildAndRunLegacyWorkspaceMigration).not.toHaveBeenCalled();
  });

  it('does not write anything on a dry run', async () => {
    getOrRecompute.mockResolvedValue(buildPreUpgradeFlatEntityMaps());

    await runOnWorkspace(true);

    expect(validateBuildAndRunLegacyWorkspaceMigration).not.toHaveBeenCalled();
  });

  it('fails the workspace when the migration fails', async () => {
    getOrRecompute.mockResolvedValue(buildPreUpgradeFlatEntityMaps());
    validateBuildAndRunLegacyWorkspaceMigration.mockResolvedValue({
      status: 'fail',
    });

    await expect(runOnWorkspace()).rejects.toThrow(
      `Failed to add opportunity Lost stage and reason for workspace ${WORKSPACE_ID}`,
    );
  });
});
