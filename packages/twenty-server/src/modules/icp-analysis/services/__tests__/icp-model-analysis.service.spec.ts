import { type IcpCriterion } from 'twenty-shared/icp-analysis';

import { type MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { type UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { IcpAnalysisException } from 'src/modules/icp-analysis/exceptions/icp-analysis.exception';
import { type IcpEvidenceService } from 'src/modules/icp-analysis/services/icp-evidence.service';
import { IcpModelAnalysisService } from 'src/modules/icp-analysis/services/icp-model-analysis.service';
import { type IcpModelWorkspaceEntity } from 'src/modules/icp-analysis/standard-objects/icp-model.workspace-entity';
import { type IcpEvidence } from 'src/modules/icp-analysis/types/icp-evidence.type';

const WORKSPACE_ID = '20202020-0000-0000-0000-000000000001';
const MODEL_ID = '20202020-0000-0000-0000-0000000000a1';
const ROLE_ID = '20202020-0000-0000-0000-0000000000c1';

const FINTECH_CRITERION: IcpCriterion = {
  id: 'industry:in:FINTECH',
  attributeKey: 'industry',
  attributeLabel: 'Industry',
  label: 'Industry: Fintech',
  category: 'FIRMOGRAPHIC',
  match: { type: 'IN', values: ['FINTECH'] },
  weight: 20,
  isHardExclusion: false,
};

const ACTION_ARGS = {
  workspaceId: WORKSPACE_ID,
  userWorkspaceId: '20202020-0000-0000-0000-0000000000d1',
  modelId: MODEL_ID,
};

const EVIDENCE: IcpEvidence = {
  attributes: [
    {
      key: 'industry',
      label: 'Industry',
      category: 'FIRMOGRAPHIC',
      valueType: 'CATEGORY',
    },
  ],
  rows: Array.from({ length: 20 }, (_, index) => ({
    id: `deal-${index}`,
    outcome: index < 8 || index % 4 === 0 ? 'WON' : 'LOST',
    closedAt: '2026-03-01T00:00:00.000Z',
    values: { industry: index < 10 ? 'FINTECH' : 'RETAIL' },
  })),
  window: { start: '2024-11-08T00:00:00.000Z', end: null },
  excludedWithoutCompanyCount: 3,
  isTruncated: false,
};

const buildService = (
  model: Partial<IcpModelWorkspaceEntity> | null,
  otherActiveModels: Partial<IcpModelWorkspaceEntity>[] = [],
) => {
  const repository = {
    findOne: jest
      .fn()
      .mockResolvedValue(model === null ? null : { id: MODEL_ID, ...model }),
    find: jest.fn().mockResolvedValue(otherActiveModels),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    insert: jest.fn().mockResolvedValue({}),
  };

  const globalWorkspaceOrmManager = {
    executeInWorkspaceContext: jest.fn(
      async (callback: () => Promise<unknown>) => callback(),
    ),
    getRepository: jest.fn().mockResolvedValue(repository),
  } as unknown as GlobalWorkspaceOrmManager;

  const buildEvidence = jest.fn().mockResolvedValue(EVIDENCE);
  const addJob = jest.fn().mockResolvedValue(undefined);

  const service = new IcpModelAnalysisService(
    globalWorkspaceOrmManager,
    {
      getRoleIdForUserWorkspace: jest.fn().mockResolvedValue(ROLE_ID),
    } as unknown as UserRoleService,
    { buildEvidence } as unknown as IcpEvidenceService,
    { add: addJob } as unknown as MessageQueueService,
  );

  return {
    service,
    repository,
    buildEvidence,
    addJob,
    globalWorkspaceOrmManager,
  };
};

describe('IcpModelAnalysisService', () => {
  describe('analyze', () => {
    it('analyses the deals the user can read and saves the snapshot', async () => {
      const { service, repository, buildEvidence, globalWorkspaceOrmManager } =
        buildService({ status: 'DRAFT', wonStages: ['CUSTOMER'] });

      const { analysis, rows } = await service.analyze(ACTION_ARGS);

      expect(globalWorkspaceOrmManager.getRepository).toHaveBeenCalledWith(
        WORKSPACE_ID,
        expect.anything(),
        { unionOf: [ROLE_ID] },
      );
      expect(buildEvidence).toHaveBeenCalledWith(
        expect.objectContaining({ readPermissions: { unionOf: [ROLE_ID] } }),
      );
      expect(rows).toBe(EVIDENCE.rows);
      expect(analysis).toMatchObject({
        excludedWithoutCompanyCount: 3,
        isTruncated: false,
        window: EVIDENCE.window,
        patterns: { totalCount: 20, wonCount: 11, lostCount: 9 },
      });
      expect(repository.update).toHaveBeenCalledWith(
        { id: MODEL_ID },
        { analysis, analyzedAt: expect.any(Date) },
      );
    });

    it('reports a model the user cannot find', async () => {
      const { service } = buildService(null);

      await expect(service.analyze(ACTION_ARGS)).rejects.toMatchObject({
        code: 'MODEL_NOT_FOUND',
      });
    });
  });

  describe('suggestCriteria', () => {
    it('suggests criteria from the saved analysis', async () => {
      const { service: analyzingService } = buildService({ status: 'DRAFT' });
      const { analysis } = await analyzingService.analyze(ACTION_ARGS);

      const { service, buildEvidence } = buildService({
        status: 'DRAFT',
        analysis,
      });

      const criteria = await service.suggestCriteria(ACTION_ARGS);

      expect(buildEvidence).not.toHaveBeenCalled();
      expect(criteria.find(({ id }) => id === 'industry:in:FINTECH')).toEqual(
        expect.objectContaining({ attributeKey: 'industry' }),
      );
    });

    it('asks for an analysis first', async () => {
      const { service } = buildService({ status: 'DRAFT', analysis: null });

      await expect(service.suggestCriteria(ACTION_ARGS)).rejects.toBeInstanceOf(
        IcpAnalysisException,
      );
      await expect(service.suggestCriteria(ACTION_ARGS)).rejects.toMatchObject({
        code: 'MODEL_NOT_ANALYZED',
      });
    });
  });

  describe('duplicate', () => {
    it('copies what the model scores against into a new draft version', async () => {
      const { service, repository } = buildService({
        name: 'Fintech mid-market',
        status: 'ACTIVE',
        version: 2,
        wonStages: ['CUSTOMER'],
        lostStages: ['LOST'],
        criteria: [FINTECH_CRITERION],
        tierThresholds: { priority: 80, target: 60, nurture: 40 },
        analysis: { analyzedAt: '2026-04-01T00:00:00.000Z' },
        activatedAt: new Date('2026-05-01T00:00:00.000Z'),
      });

      const { modelId, version } = await service.duplicate(ACTION_ARGS);

      expect(version).toBe(3);
      expect(modelId).not.toBe(MODEL_ID);

      const [insertedModel] = repository.insert.mock.calls[0];

      expect(insertedModel).toMatchObject({
        id: modelId,
        name: 'Fintech mid-market',
        status: 'DRAFT',
        version: 3,
        criteria: [FINTECH_CRITERION],
      });
      expect(insertedModel).not.toHaveProperty('analysis');
      expect(insertedModel).not.toHaveProperty('activatedAt');
    });
  });

  describe('activate', () => {
    it('activates the model, archives the one it replaces and scores the workspace', async () => {
      const { service, repository, addJob } = buildService(
        { status: 'DRAFT', version: 2, criteria: [FINTECH_CRITERION] },
        [{ id: 'previous-model', status: 'ACTIVE' }],
      );

      const result = await service.activate(ACTION_ARGS);

      expect(result).toEqual({
        modelId: MODEL_ID,
        version: 2,
        archivedModelCount: 1,
      });
      expect(repository.update).toHaveBeenCalledWith(
        { id: MODEL_ID },
        expect.objectContaining({
          status: 'ACTIVE',
          activatedAt: expect.any(Date),
          backtest: expect.objectContaining({
            inSample: expect.objectContaining({ totalCount: 20, wonCount: 11 }),
          }),
        }),
      );
      expect(repository.update).toHaveBeenCalledWith(
        { id: 'previous-model' },
        { status: 'ARCHIVED' },
      );
      expect(addJob).toHaveBeenCalledWith('IcpScoreAllJob', {
        workspaceId: WORKSPACE_ID,
      });
    });

    it('refuses a model that is already active', async () => {
      const { service, addJob } = buildService({
        status: 'ACTIVE',
        criteria: [FINTECH_CRITERION],
      });

      await expect(service.activate(ACTION_ARGS)).rejects.toMatchObject({
        code: 'MODEL_ALREADY_ACTIVE',
      });
      expect(addJob).not.toHaveBeenCalled();
    });

    it('refuses a model without criteria', async () => {
      const { service, repository } = buildService({
        status: 'DRAFT',
        criteria: [],
      });

      await expect(service.activate(ACTION_ARGS)).rejects.toMatchObject({
        code: 'MODEL_HAS_NO_CRITERIA',
      });
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
