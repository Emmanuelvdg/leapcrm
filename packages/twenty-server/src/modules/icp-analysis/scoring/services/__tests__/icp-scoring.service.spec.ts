import { type IcpCriterion } from 'twenty-shared/icp-analysis';
import { FieldMetadataType } from 'twenty-shared/types';
import { In } from 'typeorm';

import { type FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import { ICP_SCORING_BATCH_SIZE } from 'src/modules/icp-analysis/scoring/constants/icp-scoring-batch-size.constant';
import { IcpScoringService } from 'src/modules/icp-analysis/scoring/services/icp-scoring.service';
import { type IcpEvidenceService } from 'src/modules/icp-analysis/services/icp-evidence.service';
import { IcpModelWorkspaceEntity } from 'src/modules/icp-analysis/standard-objects/icp-model.workspace-entity';
import { type IcpCatalogAttribute } from 'src/modules/icp-analysis/types/icp-catalog-attribute.type';
import { ProspectCandidateWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospect-candidate.workspace-entity';

const WORKSPACE_ID = '20202020-0000-0000-0000-000000000001';

const US_CRITERION: IcpCriterion = {
  id: 'address.addressCountry:in:United States',
  attributeKey: 'address.addressCountry',
  attributeLabel: 'Address country',
  label: 'Address country: United States',
  category: 'FIRMOGRAPHIC',
  match: { type: 'IN', values: ['United States'] },
  weight: 20,
  isHardExclusion: false,
};

const ATTRIBUTES: IcpCatalogAttribute[] = [
  {
    key: 'address.addressCountry',
    label: 'Address country',
    category: 'FIRMOGRAPHIC',
    valueType: 'CATEGORY',
    source: { fieldName: 'address', fieldType: FieldMetadataType.ADDRESS },
  },
];

const ACTIVE_MODEL = {
  id: 'model-1',
  status: 'ACTIVE',
  version: 2,
  criteria: [US_CRITERION],
  tierThresholds: { priority: 80, target: 60, nurture: 40 },
};

const UNSCORED = {
  icpScore: null,
  icpTier: null,
  icpScoreReasons: null,
  icpCoverage: null,
  icpModelVersion: null,
};

const buildCompany = (id: string, country: string | null) => ({
  id,
  address: { addressCountry: country },
  ...UNSCORED,
});

const buildRepository = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
});

const buildService = ({
  isEnabled = true,
  model = ACTIVE_MODEL,
}: {
  isEnabled?: boolean;
  model?: typeof ACTIVE_MODEL | null;
} = {}) => {
  const modelRepository = buildRepository();
  const companyRepository = buildRepository();
  const candidateRepository = buildRepository();

  modelRepository.findOne.mockResolvedValue(model);

  const repositoryByEntity = new Map<unknown, unknown>([
    [IcpModelWorkspaceEntity, modelRepository],
    [CompanyWorkspaceEntity, companyRepository],
    [ProspectCandidateWorkspaceEntity, candidateRepository],
  ]);

  const globalWorkspaceOrmManager = {
    executeInWorkspaceContext: jest.fn(
      async (callback: () => Promise<unknown>) => callback(),
    ),
    getRepository: jest.fn(async (_workspaceId: string, entity: unknown) =>
      repositoryByEntity.get(entity),
    ),
  } as unknown as GlobalWorkspaceOrmManager;

  const service = new IcpScoringService(
    globalWorkspaceOrmManager,
    {
      getAttributeCatalog: jest.fn().mockResolvedValue(ATTRIBUTES),
    } as unknown as IcpEvidenceService,
    {
      isFeatureEnabled: jest.fn().mockResolvedValue(isEnabled),
    } as unknown as FeatureFlagService,
  );

  return { service, companyRepository, candidateRepository };
};

describe('IcpScoringService', () => {
  describe('scoreAll', () => {
    it('pages through every company and writes each score', async () => {
      const { service, companyRepository } = buildService();

      const firstPage = Array.from({ length: ICP_SCORING_BATCH_SIZE }, (_, i) =>
        buildCompany(`company-${String(i).padStart(4, '0')}`, 'United States'),
      );
      const secondPage = [buildCompany('company-9999', 'Canada')];

      companyRepository.find
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage);

      const summary = await service.scoreAll(WORKSPACE_ID);

      expect(companyRepository.find).toHaveBeenCalledTimes(2);
      expect(summary).toMatchObject({
        scoredCompanyCount: ICP_SCORING_BATCH_SIZE + 1,
        updatedCompanyCount: ICP_SCORING_BATCH_SIZE + 1,
      });
      expect(companyRepository.update).toHaveBeenCalledTimes(2);
      expect(companyRepository.update).toHaveBeenCalledWith(
        { id: In(firstPage.map(({ id }) => id)) },
        expect.objectContaining({
          icpScore: 100,
          icpTier: 'PRIORITY',
          icpScoreReasons: 'Address country: United States (+20)',
          icpCoverage: 100,
          icpModelVersion: 2,
        }),
      );
      expect(companyRepository.update).toHaveBeenCalledWith(
        { id: In(['company-9999']) },
        expect.objectContaining({ icpScore: 0, icpTier: 'EXCLUDED' }),
      );
    });

    it('writes nothing when no score changed since the last run', async () => {
      const { service, companyRepository } = buildService();

      companyRepository.find.mockResolvedValueOnce([
        {
          ...buildCompany('company-1', 'United States'),
          icpScore: 100,
          icpTier: 'PRIORITY',
          icpScoreReasons: 'Address country: United States (+20)',
          icpCoverage: 100,
          icpModelVersion: 2,
        },
      ]);

      const summary = await service.scoreAll(WORKSPACE_ID);

      expect(summary).toMatchObject({
        scoredCompanyCount: 1,
        updatedCompanyCount: 0,
      });
      expect(companyRepository.update).not.toHaveBeenCalled();
    });

    it('scores a candidate from its matched company, falling back to its own country', async () => {
      const { service, companyRepository, candidateRepository } =
        buildService();

      candidateRepository.find.mockResolvedValueOnce([
        {
          id: 'matched-candidate',
          matchedCompanyId: 'company-1',
          country: 'CA',
          employeeCount: null,
          ...UNSCORED,
        },
        {
          id: 'unmatched-candidate',
          matchedCompanyId: null,
          country: 'US',
          employeeCount: null,
          ...UNSCORED,
        },
      ]);
      companyRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([buildCompany('company-1', 'United States')]);

      await service.scoreAll(WORKSPACE_ID);

      expect(candidateRepository.update).toHaveBeenCalledTimes(1);
      expect(candidateRepository.update).toHaveBeenCalledWith(
        { id: In(['matched-candidate', 'unmatched-candidate']) },
        expect.objectContaining({ icpScore: 100 }),
      );
    });

    it('does nothing when ICP analysis is off for the workspace', async () => {
      const { service, companyRepository } = buildService({
        isEnabled: false,
      });

      expect(await service.scoreAll(WORKSPACE_ID)).toBeNull();
      expect(companyRepository.find).not.toHaveBeenCalled();
    });

    it('does nothing without an active model', async () => {
      const { service, companyRepository } = buildService({ model: null });

      expect(await service.scoreAll(WORKSPACE_ID)).toBeNull();
      expect(companyRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('scoreRecords', () => {
    it('skips companies whose changed fields the model does not read', async () => {
      const { service, companyRepository } = buildService();

      const summary = await service.scoreRecords({
        workspaceId: WORKSPACE_ID,
        companyIds: ['company-1'],
        candidateIds: [],
        changedCompanyFieldNames: ['name'],
      });

      expect(summary).toMatchObject({ scoredCompanyCount: 0 });
      expect(companyRepository.find).not.toHaveBeenCalled();
    });

    it('rescores a company and its candidates when a field the model reads changed', async () => {
      const { service, companyRepository, candidateRepository } =
        buildService();

      companyRepository.find.mockResolvedValue([
        buildCompany('company-1', 'United States'),
      ]);
      candidateRepository.find.mockResolvedValueOnce([
        {
          id: 'candidate-1',
          matchedCompanyId: 'company-1',
          country: null,
          employeeCount: null,
          ...UNSCORED,
        },
      ]);

      const summary = await service.scoreRecords({
        workspaceId: WORKSPACE_ID,
        companyIds: ['company-1'],
        candidateIds: [],
        changedCompanyFieldNames: ['address'],
      });

      expect(summary).toMatchObject({
        scoredCompanyCount: 1,
        updatedCompanyCount: 1,
        scoredCandidateCount: 1,
        updatedCandidateCount: 1,
      });
    });
  });
});
