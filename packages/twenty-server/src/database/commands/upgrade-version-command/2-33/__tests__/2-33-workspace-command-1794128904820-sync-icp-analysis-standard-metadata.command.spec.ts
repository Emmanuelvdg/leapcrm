import { STANDARD_OBJECTS } from 'twenty-shared/metadata';

import { type WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { SyncIcpAnalysisStandardMetadataCommand } from 'src/database/commands/upgrade-version-command/2-33/2-33-workspace-command-1794128904820-sync-icp-analysis-standard-metadata.command';
import { type ApplicationService } from 'src/engine/core-modules/application/application.service';
import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { type WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const WORKSPACE_ID = '20202020-0000-0000-0000-000000000001';
const STANDARD_APPLICATION_ID = '20202020-0000-0000-0000-0000000000b1';

const ICP_SCORE_FIELD_NAMES = [
  'icpScore',
  'icpTier',
  'icpScoreReasons',
  'icpCoverage',
  'icpModelVersion',
  'icpScoredAt',
] as const;

const ICP_UNIVERSAL_IDENTIFIERS = new Set<string>([
  STANDARD_OBJECTS.icpModel.universalIdentifier,
  ...Object.values(STANDARD_OBJECTS.icpModel.fields).map(
    ({ universalIdentifier }) => universalIdentifier,
  ),
  ...Object.values(STANDARD_OBJECTS.icpModel.indexes).map(
    ({ universalIdentifier }) => universalIdentifier,
  ),
  STANDARD_OBJECTS.icpModel.views.allIcpModels.universalIdentifier,
  ...Object.values(STANDARD_OBJECTS.icpModel.views.allIcpModels.viewFields).map(
    ({ universalIdentifier }) => universalIdentifier,
  ),
  ...ICP_SCORE_FIELD_NAMES.flatMap((fieldName) => [
    STANDARD_OBJECTS.company.fields[fieldName].universalIdentifier,
    STANDARD_OBJECTS.prospectCandidate.fields[fieldName].universalIdentifier,
  ]),
]);

const withoutIcpEntities = <TMaps extends { byUniversalIdentifier: object }>(
  flatEntityMaps: TMaps,
): TMaps => ({
  ...flatEntityMaps,
  byUniversalIdentifier: Object.fromEntries(
    Object.entries(flatEntityMaps.byUniversalIdentifier).filter(
      ([universalIdentifier]) =>
        !ICP_UNIVERSAL_IDENTIFIERS.has(universalIdentifier),
    ),
  ),
});

const computeStandardMaps = () =>
  computeTwentyStandardApplicationAllFlatEntityMaps({
    now: new Date().toISOString(),
    workspaceId: WORKSPACE_ID,
    twentyStandardApplicationId: STANDARD_APPLICATION_ID,
  }).allFlatEntityMaps;

// A workspace created before ICP analysis existed.
const buildPreIcpWorkspaceMaps = () => {
  const standardMaps = computeStandardMaps();

  return {
    flatObjectMetadataMaps: withoutIcpEntities(
      standardMaps.flatObjectMetadataMaps,
    ),
    flatFieldMetadataMaps: withoutIcpEntities(
      standardMaps.flatFieldMetadataMaps,
    ),
    flatIndexMaps: withoutIcpEntities(standardMaps.flatIndexMaps),
    flatViewMaps: withoutIcpEntities(standardMaps.flatViewMaps),
    flatViewFieldMaps: withoutIcpEntities(standardMaps.flatViewFieldMaps),
    flatCommandMenuItemMaps: createEmptyFlatEntityMaps(),
  };
};

describe('SyncIcpAnalysisStandardMetadataCommand', () => {
  let command: SyncIcpAnalysisStandardMetadataCommand;
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

    command = new SyncIcpAnalysisStandardMetadataCommand(
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

    return validateBuildAndRunLegacyWorkspaceMigration.mock.calls[0][0]
      .allFlatEntityOperationByMetadataName;
  };

  const getCreatedScoreFields = (
    createdFields: FlatFieldMetadata[],
    objectName: 'company' | 'prospectCandidate',
  ) =>
    createdFields.filter((createdField) =>
      ICP_SCORE_FIELD_NAMES.some(
        (fieldName) =>
          STANDARD_OBJECTS[objectName].fields[fieldName].universalIdentifier ===
          createdField.universalIdentifier,
      ),
    );

  it('creates the ICP model object with its view and navigation, and the score fields', async () => {
    getOrRecompute.mockResolvedValue(buildPreIcpWorkspaceMaps());

    await runOnWorkspace();

    const operations = getAppliedOperations();
    const createdFields: FlatFieldMetadata[] =
      operations.fieldMetadata.flatEntityToCreate;

    expect(
      operations.objectMetadata.flatEntityToCreate.map(
        ({ nameSingular }: { nameSingular: string }) => nameSingular,
      ),
    ).toEqual(['icpModel']);
    expect(createdFields.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['criteria', 'tierThresholds', 'insights']),
    );
    expect(getCreatedScoreFields(createdFields, 'company')).toHaveLength(6);
    expect(
      getCreatedScoreFields(createdFields, 'prospectCandidate'),
    ).toHaveLength(6);
    expect(operations.index.flatEntityToCreate).toHaveLength(1);
    expect(operations.view.flatEntityToCreate).toHaveLength(1);
    expect(operations.viewField.flatEntityToCreate).toHaveLength(7);
    expect(operations.commandMenuItem.flatEntityToCreate).toHaveLength(1);
  });

  it('leaves out a score field whose name a custom field already uses', async () => {
    const preIcpWorkspaceMaps = buildPreIcpWorkspaceMaps();
    const companyName =
      preIcpWorkspaceMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.company.fields.name.universalIdentifier
      ];

    if (companyName === undefined) {
      throw new Error('Standard company name field missing');
    }

    const customFieldUniversalIdentifier =
      '6a1f1d0e-5a52-4a83-9a40-5e0a7b7a7a04';

    getOrRecompute.mockResolvedValue({
      ...preIcpWorkspaceMaps,
      flatFieldMetadataMaps: {
        ...preIcpWorkspaceMaps.flatFieldMetadataMaps,
        byUniversalIdentifier: {
          ...preIcpWorkspaceMaps.flatFieldMetadataMaps.byUniversalIdentifier,
          [customFieldUniversalIdentifier]: {
            ...companyName,
            id: customFieldUniversalIdentifier,
            universalIdentifier: customFieldUniversalIdentifier,
            name: 'icpScore',
          },
        },
      },
    });

    await runOnWorkspace();

    const createdCompanyScoreFields = getCreatedScoreFields(
      getAppliedOperations().fieldMetadata.flatEntityToCreate,
      'company',
    );

    expect(createdCompanyScoreFields.map(({ name }) => name)).not.toContain(
      'icpScore',
    );
    expect(createdCompanyScoreFields).toHaveLength(5);
  });

  it('does nothing when everything already exists', async () => {
    getOrRecompute.mockResolvedValue(buildPreIcpWorkspaceMaps());
    await runOnWorkspace();

    const [createdNavigationItem] =
      getAppliedOperations().commandMenuItem.flatEntityToCreate;

    validateBuildAndRunLegacyWorkspaceMigration.mockClear();

    const standardMaps = computeStandardMaps();

    getOrRecompute.mockResolvedValue({
      flatObjectMetadataMaps: standardMaps.flatObjectMetadataMaps,
      flatFieldMetadataMaps: standardMaps.flatFieldMetadataMaps,
      flatIndexMaps: standardMaps.flatIndexMaps,
      flatViewMaps: standardMaps.flatViewMaps,
      flatViewFieldMaps: standardMaps.flatViewFieldMaps,
      flatCommandMenuItemMaps: {
        ...createEmptyFlatEntityMaps(),
        byUniversalIdentifier: {
          [createdNavigationItem.universalIdentifier]: createdNavigationItem,
        },
      },
    });

    await runOnWorkspace();

    expect(validateBuildAndRunLegacyWorkspaceMigration).not.toHaveBeenCalled();
  });

  it('does not write anything on a dry run', async () => {
    getOrRecompute.mockResolvedValue(buildPreIcpWorkspaceMaps());

    await runOnWorkspace(true);

    expect(validateBuildAndRunLegacyWorkspaceMigration).not.toHaveBeenCalled();
  });
});
