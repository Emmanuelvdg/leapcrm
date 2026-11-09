import { DEFAULT_ICP_TIER_THRESHOLDS } from 'twenty-shared/icp-analysis';

import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { IcpModelValidationService } from 'src/modules/icp-analysis/services/icp-model-validation.service';
import { type IcpModelWorkspaceEntity } from 'src/modules/icp-analysis/standard-objects/icp-model.workspace-entity';

const WORKSPACE_ID = '20202020-0000-0000-0000-000000000001';
const MODEL_ID = '20202020-0000-0000-0000-0000000000a1';

const buildService = (
  existingModel: Partial<IcpModelWorkspaceEntity> | null,
) => {
  const findOneBy = jest.fn().mockResolvedValue(existingModel);

  const globalWorkspaceOrmManager = {
    executeInWorkspaceContext: jest.fn(
      async (callback: () => Promise<unknown>) => callback(),
    ),
    getRepository: jest.fn().mockResolvedValue({ findOneBy }),
  } as unknown as GlobalWorkspaceOrmManager;

  return {
    service: new IcpModelValidationService(globalWorkspaceOrmManager),
    findOneBy,
  };
};

describe('IcpModelValidationService', () => {
  describe('prepareCreateData', () => {
    it('fills in default stages, criteria and thresholds', () => {
      const { service } = buildService(null);

      expect(service.prepareCreateData({ name: 'First model' })).toEqual({
        name: 'First model',
        wonStages: ['CUSTOMER'],
        lostStages: ['LOST'],
        criteria: [],
        tierThresholds: DEFAULT_ICP_TIER_THRESHOLDS,
      });
    });

    it('checks the stages after defaults are applied', () => {
      const { service } = buildService(null);

      expect(() =>
        service.prepareCreateData({ name: 'Mixed up', wonStages: ['LOST'] }),
      ).toThrow(
        'Invalid ICP model: Stage LOST cannot count as both won and lost',
      );
    });

    it('refuses an upsert', () => {
      const { service } = buildService(null);

      expect(() => service.assertNotUpsert(true)).toThrow(
        'Invalid ICP model: models cannot be upserted',
      );
      expect(() => service.assertNotUpsert(undefined)).not.toThrow();
    });
  });

  describe('assertValidUpdateOne', () => {
    it('lets any model be renamed without loading it', async () => {
      const { service, findOneBy } = buildService({ status: 'ACTIVE' });

      await expect(
        service.assertValidUpdateOne({
          id: MODEL_ID,
          data: { name: 'Renamed' },
          workspaceId: WORKSPACE_ID,
        }),
      ).resolves.toBeUndefined();
      expect(findOneBy).not.toHaveBeenCalled();
    });

    it.each(['ACTIVE', 'ARCHIVED'] as const)(
      'keeps the criteria of an %s model fixed',
      async (status) => {
        const { service } = buildService({ status });

        await expect(
          service.assertValidUpdateOne({
            id: MODEL_ID,
            data: { criteria: [] },
            workspaceId: WORKSPACE_ID,
          }),
        ).rejects.toThrow(/duplicate the model to change its criteria/);
      },
    );

    it('checks a draft change against the stages already saved', async () => {
      const { service } = buildService({
        status: 'DRAFT',
        wonStages: ['CUSTOMER'],
        lostStages: ['LOST'],
      });

      await expect(
        service.assertValidUpdateOne({
          id: MODEL_ID,
          data: { wonStages: ['CUSTOMER', 'LOST'] },
          workspaceId: WORKSPACE_ID,
        }),
      ).rejects.toThrow('Stage LOST cannot count as both won and lost');

      await expect(
        service.assertValidUpdateOne({
          id: MODEL_ID,
          data: { wonStages: ['CUSTOMER', 'RENEWED'] },
          workspaceId: WORKSPACE_ID,
        }),
      ).resolves.toBeUndefined();
    });

    it('refuses to activate through an update', async () => {
      const { service } = buildService({ status: 'DRAFT' });

      await expect(
        service.assertValidUpdateOne({
          id: MODEL_ID,
          data: { status: 'ACTIVE' },
          workspaceId: WORKSPACE_ID,
        }),
      ).rejects.toThrow('Use the Activate action to make a model active');
    });
  });

  describe('assertValidUpdateMany', () => {
    it('allows bulk renames but not bulk criteria changes', () => {
      const { service } = buildService(null);

      expect(() =>
        service.assertValidUpdateMany({ name: 'Bulk rename' }),
      ).not.toThrow();
      expect(() =>
        service.assertValidUpdateMany({ tierThresholds: null }),
      ).toThrow(/one model at a time/);
    });
  });
});
