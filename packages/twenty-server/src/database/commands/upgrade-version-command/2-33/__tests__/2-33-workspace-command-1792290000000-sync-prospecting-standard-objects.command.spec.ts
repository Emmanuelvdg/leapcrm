import { STANDARD_OBJECTS } from 'twenty-shared/metadata';

import { type WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { SyncProspectingStandardObjectsCommand } from 'src/database/commands/upgrade-version-command/2-33/2-33-workspace-command-1792290000000-sync-prospecting-standard-objects.command';
import { type ApplicationService } from 'src/engine/core-modules/application/application.service';
import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { type WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { type WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const WORKSPACE_ID = '20202020-0000-0000-0000-000000000001';
const STANDARD_APPLICATION_ID = '20202020-0000-0000-0000-0000000000b1';

const PROSPECTING_OBJECT_UNIVERSAL_IDENTIFIERS: string[] = [
  STANDARD_OBJECTS.prospectingCampaign.universalIdentifier,
  STANDARD_OBJECTS.prospectCandidate.universalIdentifier,
];

// A workspace created before prospecting existed: every standard entity
// except the prospecting ones.
const buildPreProspectingWorkspaceMaps = () => {
  const { allFlatEntityMaps } = computeTwentyStandardApplicationAllFlatEntityMaps(
    {
      now: new Date().toISOString(),
      workspaceId: WORKSPACE_ID,
      twentyStandardApplicationId: STANDARD_APPLICATION_ID,
    },
  );

  const flatObjectMetadataMaps = {
    ...allFlatEntityMaps.flatObjectMetadataMaps,
    byUniversalIdentifier: Object.fromEntries(
      Object.entries(
        allFlatEntityMaps.flatObjectMetadataMaps.byUniversalIdentifier,
      ).filter(
        ([universalIdentifier]) =>
          !PROSPECTING_OBJECT_UNIVERSAL_IDENTIFIERS.includes(universalIdentifier),
      ),
    ),
  };

  return {
    flatObjectMetadataMaps,
    flatFieldMetadataMaps: createEmptyFlatEntityMaps(),
    flatIndexMaps: createEmptyFlatEntityMaps(),
    flatViewMaps: createEmptyFlatEntityMaps(),
    flatViewFieldMaps: createEmptyFlatEntityMaps(),
    flatCommandMenuItemMaps: createEmptyFlatEntityMaps(),
  };
};

describe('SyncProspectingStandardObjectsCommand', () => {
  let command: SyncProspectingStandardObjectsCommand;
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

    command = new SyncProspectingStandardObjectsCommand(
      {} as WorkspaceIteratorService,
      applicationService,
      { getOrRecompute } as unknown as WorkspaceCacheService,
      {
        validateBuildAndRunLegacyWorkspaceMigration,
      } as unknown as WorkspaceMigrationValidateBuildAndRunService,
    );

    jest.spyOn(command['logger'], 'log').mockImplementation();
    jest.spyOn(command['logger'], 'error').mockImplementation();
  });

  const runOnWorkspace = (dryRun = false) =>
    command.runOnWorkspace({
      workspaceId: WORKSPACE_ID,
      options: { dryRun },
      index: 0,
      total: 1,
    });

  it('creates both objects, their fields, indexes, views and navigation commands', async () => {
    getOrRecompute.mockResolvedValue(buildPreProspectingWorkspaceMaps());

    await runOnWorkspace();

    const [{ allFlatEntityOperationByMetadataName }] =
      validateBuildAndRunLegacyWorkspaceMigration.mock.calls[0];

    const createdObjectNames =
      allFlatEntityOperationByMetadataName.objectMetadata.flatEntityToCreate.map(
        (objectMetadata: { nameSingular: string }) =>
          objectMetadata.nameSingular,
      );
    const createdFieldNames =
      allFlatEntityOperationByMetadataName.fieldMetadata.flatEntityToCreate.map(
        (fieldMetadata: { name: string }) => fieldMetadata.name,
      );

    expect(createdObjectNames.sort()).toEqual([
      'prospectCandidate',
      'prospectingCampaign',
    ]);
    expect(createdFieldNames).toEqual(
      expect.arrayContaining([
        'identityKey',
        'matchedCompany',
        'candidates',
        'prospectCandidates',
      ]),
    );
    expect(
      allFlatEntityOperationByMetadataName.index.flatEntityToCreate,
    ).toHaveLength(5);
    expect(
      allFlatEntityOperationByMetadataName.view.flatEntityToCreate,
    ).toHaveLength(2);
    expect(
      allFlatEntityOperationByMetadataName.commandMenuItem.flatEntityToCreate,
    ).toHaveLength(2);
  });

  it('skips a workspace that already has the prospecting objects', async () => {
    getOrRecompute.mockResolvedValue({
      ...buildPreProspectingWorkspaceMaps(),
      flatObjectMetadataMaps: computeTwentyStandardApplicationAllFlatEntityMaps(
        {
          now: new Date().toISOString(),
          workspaceId: WORKSPACE_ID,
          twentyStandardApplicationId: STANDARD_APPLICATION_ID,
        },
      ).allFlatEntityMaps.flatObjectMetadataMaps,
    });

    await runOnWorkspace();

    expect(validateBuildAndRunLegacyWorkspaceMigration).not.toHaveBeenCalled();
  });

  it('does not write anything on a dry run', async () => {
    getOrRecompute.mockResolvedValue(buildPreProspectingWorkspaceMaps());

    await runOnWorkspace(true);

    expect(validateBuildAndRunLegacyWorkspaceMigration).not.toHaveBeenCalled();
  });
});
