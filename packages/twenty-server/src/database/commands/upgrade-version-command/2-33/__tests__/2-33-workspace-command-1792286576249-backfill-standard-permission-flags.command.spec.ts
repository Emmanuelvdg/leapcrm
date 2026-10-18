import { PermissionFlagType, SystemPermissionFlag } from 'twenty-shared/constants';

import { type WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { BackfillStandardPermissionFlagsCommand } from 'src/database/commands/upgrade-version-command/2-33/2-33-workspace-command-1792286576249-backfill-standard-permission-flags.command';
import { type ApplicationService } from 'src/engine/core-modules/application/application.service';
import { type FlatPermissionFlagMaps } from 'src/engine/metadata-modules/flat-permission-flag/types/flat-permission-flag-maps.type';
import { type WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { type WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const WORKSPACE_ID = '20202020-0000-0000-0000-000000000001';
const STANDARD_APPLICATION_ID = '20202020-0000-0000-0000-0000000000b1';

const buildStandardPermissionFlagMaps = (): FlatPermissionFlagMaps =>
  computeTwentyStandardApplicationAllFlatEntityMaps({
    now: new Date().toISOString(),
    workspaceId: WORKSPACE_ID,
    twentyStandardApplicationId: STANDARD_APPLICATION_ID,
  }).allFlatEntityMaps.flatPermissionFlagMaps;

const withoutPermissionFlag = (
  flatPermissionFlagMaps: FlatPermissionFlagMaps,
  universalIdentifier: string,
): FlatPermissionFlagMaps => {
  const byUniversalIdentifier = {
    ...flatPermissionFlagMaps.byUniversalIdentifier,
  };

  delete byUniversalIdentifier[universalIdentifier];

  return { ...flatPermissionFlagMaps, byUniversalIdentifier };
};

describe('BackfillStandardPermissionFlagsCommand', () => {
  let command: BackfillStandardPermissionFlagsCommand;
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

    command = new BackfillStandardPermissionFlagsCommand(
      {} as WorkspaceIteratorService,
      applicationService,
      {
        validateBuildAndRunLegacyWorkspaceMigration,
      } as unknown as WorkspaceMigrationValidateBuildAndRunService,
      { getOrRecompute } as unknown as WorkspaceCacheService,
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

  it('creates only the standard permission flags the workspace is missing', async () => {
    getOrRecompute.mockResolvedValue({
      flatPermissionFlagMaps: withoutPermissionFlag(
        buildStandardPermissionFlagMaps(),
        SystemPermissionFlag.PROSPECTING,
      ),
    });

    await runOnWorkspace();

    expect(validateBuildAndRunLegacyWorkspaceMigration).toHaveBeenCalledTimes(
      1,
    );

    const [{ allFlatEntityOperationByMetadataName }] =
      validateBuildAndRunLegacyWorkspaceMigration.mock.calls[0];
    const createdKeys =
      allFlatEntityOperationByMetadataName.permissionFlag.flatEntityToCreate.map(
        (permissionFlag: { key: string }) => permissionFlag.key,
      );

    expect(createdKeys).toEqual([PermissionFlagType.PROSPECTING]);
  });

  it('does nothing when every standard permission flag already exists', async () => {
    getOrRecompute.mockResolvedValue({
      flatPermissionFlagMaps: buildStandardPermissionFlagMaps(),
    });

    await runOnWorkspace();

    expect(validateBuildAndRunLegacyWorkspaceMigration).not.toHaveBeenCalled();
  });

  it('does not write anything on a dry run', async () => {
    getOrRecompute.mockResolvedValue({
      flatPermissionFlagMaps: withoutPermissionFlag(
        buildStandardPermissionFlagMaps(),
        SystemPermissionFlag.PROSPECTING,
      ),
    });

    await runOnWorkspace(true);

    expect(validateBuildAndRunLegacyWorkspaceMigration).not.toHaveBeenCalled();
  });

  it('fails the workspace when the migration fails', async () => {
    getOrRecompute.mockResolvedValue({
      flatPermissionFlagMaps: withoutPermissionFlag(
        buildStandardPermissionFlagMaps(),
        SystemPermissionFlag.PROSPECTING,
      ),
    });
    validateBuildAndRunLegacyWorkspaceMigration.mockResolvedValue({
      status: 'fail',
    });

    await expect(runOnWorkspace()).rejects.toThrow(
      `Failed to backfill standard permission flags for workspace ${WORKSPACE_ID}`,
    );
  });
});
