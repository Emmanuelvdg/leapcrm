import {
  PermissionFlagType,
  SystemPermissionFlag,
} from 'twenty-shared/constants';

import { type WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { BackfillIcpAnalysisPermissionFlagCommand } from 'src/database/commands/upgrade-version-command/2-33/2-33-workspace-command-1794106415335-backfill-icp-analysis-permission-flag.command';
import { type ApplicationService } from 'src/engine/core-modules/application/application.service';
import { type FlatPermissionFlagMaps } from 'src/engine/metadata-modules/flat-permission-flag/types/flat-permission-flag-maps.type';
import { type WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { type WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const WORKSPACE_ID = '20202020-0000-0000-0000-000000000001';
const STANDARD_APPLICATION_ID = '20202020-0000-0000-0000-0000000000b1';

const buildPermissionFlagMapsWithoutIcpAnalysis =
  (): FlatPermissionFlagMaps => {
    const flatPermissionFlagMaps =
      computeTwentyStandardApplicationAllFlatEntityMaps({
        now: new Date().toISOString(),
        workspaceId: WORKSPACE_ID,
        twentyStandardApplicationId: STANDARD_APPLICATION_ID,
      }).allFlatEntityMaps.flatPermissionFlagMaps;

    const byUniversalIdentifier = {
      ...flatPermissionFlagMaps.byUniversalIdentifier,
    };

    delete byUniversalIdentifier[SystemPermissionFlag.ICP_ANALYSIS];

    return { ...flatPermissionFlagMaps, byUniversalIdentifier };
  };

describe('BackfillIcpAnalysisPermissionFlagCommand', () => {
  it('creates the ICP_ANALYSIS permission flag in a workspace that predates it', async () => {
    const validateBuildAndRunLegacyWorkspaceMigration = jest
      .fn()
      .mockResolvedValue({ status: 'success' });

    const command = new BackfillIcpAnalysisPermissionFlagCommand(
      {} as WorkspaceIteratorService,
      {
        findWorkspaceTwentyStandardAndCustomApplicationOrThrow: jest
          .fn()
          .mockResolvedValue({
            twentyStandardFlatApplication: {
              id: STANDARD_APPLICATION_ID,
              universalIdentifier: STANDARD_APPLICATION_ID,
            },
          }),
      } as unknown as ApplicationService,
      {
        validateBuildAndRunLegacyWorkspaceMigration,
      } as unknown as WorkspaceMigrationValidateBuildAndRunService,
      {
        getOrRecompute: jest.fn().mockResolvedValue({
          flatPermissionFlagMaps: buildPermissionFlagMapsWithoutIcpAnalysis(),
        }),
      } as unknown as WorkspaceCacheService,
    );

    jest.spyOn(command['logger'], 'log').mockImplementation();

    await command.runOnWorkspace({
      workspaceId: WORKSPACE_ID,
      options: {},
      index: 0,
      total: 1,
    });

    const [{ allFlatEntityOperationByMetadataName }] =
      validateBuildAndRunLegacyWorkspaceMigration.mock.calls[0];

    expect(
      allFlatEntityOperationByMetadataName.permissionFlag.flatEntityToCreate.map(
        (permissionFlag: { key: string; permissionType: string }) => ({
          key: permissionFlag.key,
          permissionType: permissionFlag.permissionType,
        }),
      ),
    ).toEqual([
      { key: PermissionFlagType.ICP_ANALYSIS, permissionType: 'tool' },
    ]);
  });
});
