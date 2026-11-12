import { Injectable } from '@nestjs/common';

import {
  computeIcpScore,
  DEFAULT_ICP_TIER_THRESHOLDS,
  type IcpAttributeValues,
} from 'twenty-shared/icp-analysis';
import { FeatureFlagKey } from 'twenty-shared/types';
import { isDefined, isNonEmptyArray } from 'twenty-shared/utils';
import { In, MoreThan } from 'typeorm';

import { FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { type RolePermissionConfig } from 'src/engine/twenty-orm/types/role-permission-config';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import { ICP_SCORING_BATCH_SIZE } from 'src/modules/icp-analysis/scoring/constants/icp-scoring-batch-size.constant';
import { type IcpScoreFields } from 'src/modules/icp-analysis/scoring/types/icp-score-fields.type';
import { type IcpScoringSummary } from 'src/modules/icp-analysis/scoring/types/icp-scoring-summary.type';
import { buildIcpCandidateAttributeRecord } from 'src/modules/icp-analysis/scoring/utils/build-icp-candidate-attribute-record.util';
import { buildIcpScoreUpdate } from 'src/modules/icp-analysis/scoring/utils/build-icp-score-update.util';
import { getIcpModelSourceFieldNames } from 'src/modules/icp-analysis/scoring/utils/get-icp-model-source-field-names.util';
import { groupIcpScoreUpdates } from 'src/modules/icp-analysis/scoring/utils/group-icp-score-updates.util';
import { mergeIcpAttributeValues } from 'src/modules/icp-analysis/scoring/utils/merge-icp-attribute-values.util';
import { IcpEvidenceService } from 'src/modules/icp-analysis/services/icp-evidence.service';
import { IcpModelWorkspaceEntity } from 'src/modules/icp-analysis/standard-objects/icp-model.workspace-entity';
import { type IcpCatalogAttribute } from 'src/modules/icp-analysis/types/icp-catalog-attribute.type';
import { extractIcpAttributeValues } from 'src/modules/icp-analysis/utils/extract-icp-attribute-values.util';
import { ProspectCandidateWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospect-candidate.workspace-entity';

type IcpScoringContext = {
  model: IcpModelWorkspaceEntity;
  attributes: IcpCatalogAttribute[];
  companyRepository: WorkspaceRepository<CompanyWorkspaceEntity>;
  candidateRepository: WorkspaceRepository<ProspectCandidateWorkspaceEntity>;
  scoredAt: Date;
};

type IcpScoreCount = { scoredCount: number; updatedCount: number };

const EMPTY_SCORE_COUNT: IcpScoreCount = { scoredCount: 0, updatedCount: 0 };

const SYSTEM_PERMISSIONS: RolePermissionConfig = {
  shouldBypassPermissionChecks: true,
};

const chunk = <TItem>(items: TItem[], size: number): TItem[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );

const addScoreCounts = (
  first: IcpScoreCount,
  second: IcpScoreCount,
): IcpScoreCount => ({
  scoredCount: first.scoredCount + second.scoredCount,
  updatedCount: first.updatedCount + second.updatedCount,
});

const toSummary = (
  companies: IcpScoreCount,
  candidates: IcpScoreCount,
): IcpScoringSummary => ({
  scoredCompanyCount: companies.scoredCount,
  updatedCompanyCount: companies.updatedCount,
  scoredCandidateCount: candidates.scoredCount,
  updatedCandidateCount: candidates.updatedCount,
});

// Scores are system data: they are computed for every record whatever the
// permissions of whoever triggered the run.
@Injectable()
export class IcpScoringService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly icpEvidenceService: IcpEvidenceService,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async scoreAll(workspaceId: string): Promise<IcpScoringSummary | null> {
    return this.withScoringContext(workspaceId, async (context) => {
      const companies = await this.scoreCompanyPages(context);
      const candidates = await this.scoreCandidatePages(context);

      return toSummary(companies, candidates);
    });
  }

  // When companies changed, only changes to fields the model reads matter;
  // null means the companies are new and always get a score.
  async scoreRecords({
    workspaceId,
    companyIds,
    candidateIds,
    changedCompanyFieldNames,
  }: {
    workspaceId: string;
    companyIds: string[];
    candidateIds: string[];
    changedCompanyFieldNames: string[] | null;
  }): Promise<IcpScoringSummary | null> {
    return this.withScoringContext(workspaceId, async (context) => {
      const sourceFieldNames = getIcpModelSourceFieldNames({
        criteria: context.model.criteria ?? [],
        attributes: context.attributes,
      });

      const companyIdsToScore =
        changedCompanyFieldNames === null ||
        changedCompanyFieldNames.some((fieldName) =>
          sourceFieldNames.has(fieldName),
        )
          ? companyIds
          : [];

      let companies = EMPTY_SCORE_COUNT;
      let candidates = EMPTY_SCORE_COUNT;

      for (const companyIdBatch of chunk(
        companyIdsToScore,
        ICP_SCORING_BATCH_SIZE,
      )) {
        const companyBatch = await context.companyRepository.find({
          where: { id: In(companyIdBatch) },
        });

        companies = addScoreCounts(
          companies,
          await this.scoreCompanies(context, companyBatch),
        );

        const matchedCandidates = await context.candidateRepository.find({
          where: { matchedCompanyId: In(companyIdBatch) },
        });

        candidates = addScoreCounts(
          candidates,
          await this.scoreCandidates(context, matchedCandidates),
        );
      }

      for (const candidateIdBatch of chunk(
        candidateIds,
        ICP_SCORING_BATCH_SIZE,
      )) {
        const candidateBatch = await context.candidateRepository.find({
          where: { id: In(candidateIdBatch) },
        });

        candidates = addScoreCounts(
          candidates,
          await this.scoreCandidates(context, candidateBatch),
        );
      }

      return toSummary(companies, candidates);
    });
  }

  private async withScoringContext<TResult>(
    workspaceId: string,
    callback: (context: IcpScoringContext) => Promise<TResult>,
  ): Promise<TResult | null> {
    const isIcpAnalysisEnabled = await this.featureFlagService.isFeatureEnabled(
      FeatureFlagKey.IS_ICP_ANALYSIS_ENABLED,
      workspaceId,
    );

    if (!isIcpAnalysisEnabled) {
      return null;
    }

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const modelRepository =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            IcpModelWorkspaceEntity,
            SYSTEM_PERMISSIONS,
          );

        const model = await modelRepository.findOne({
          where: { status: 'ACTIVE' },
          order: { activatedAt: 'DESC' },
        });

        if (!isDefined(model) || !isNonEmptyArray(model.criteria)) {
          return null;
        }

        return callback({
          model,
          attributes:
            await this.icpEvidenceService.getAttributeCatalog(workspaceId),
          companyRepository: await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            CompanyWorkspaceEntity,
            SYSTEM_PERMISSIONS,
          ),
          candidateRepository:
            await this.globalWorkspaceOrmManager.getRepository(
              workspaceId,
              ProspectCandidateWorkspaceEntity,
              SYSTEM_PERMISSIONS,
            ),
          scoredAt: new Date(),
        });
      },
      buildSystemAuthContext(workspaceId),
    );
  }

  private async scoreCompanyPages(
    context: IcpScoringContext,
  ): Promise<IcpScoreCount> {
    let total = EMPTY_SCORE_COUNT;
    let lastId: string | null = null;

    for (;;) {
      const companies: CompanyWorkspaceEntity[] =
        await context.companyRepository.find({
          where: isDefined(lastId) ? { id: MoreThan(lastId) } : {},
          order: { id: 'ASC' },
          take: ICP_SCORING_BATCH_SIZE,
        });

      total = addScoreCounts(
        total,
        await this.scoreCompanies(context, companies),
      );

      if (companies.length < ICP_SCORING_BATCH_SIZE) {
        return total;
      }

      lastId = companies[companies.length - 1].id;
    }
  }

  private async scoreCandidatePages(
    context: IcpScoringContext,
  ): Promise<IcpScoreCount> {
    let total = EMPTY_SCORE_COUNT;
    let lastId: string | null = null;

    for (;;) {
      const candidates: ProspectCandidateWorkspaceEntity[] =
        await context.candidateRepository.find({
          where: isDefined(lastId) ? { id: MoreThan(lastId) } : {},
          order: { id: 'ASC' },
          take: ICP_SCORING_BATCH_SIZE,
        });

      total = addScoreCounts(
        total,
        await this.scoreCandidates(context, candidates),
      );

      if (candidates.length < ICP_SCORING_BATCH_SIZE) {
        return total;
      }

      lastId = candidates[candidates.length - 1].id;
    }
  }

  private async scoreCompanies(
    context: IcpScoringContext,
    companies: CompanyWorkspaceEntity[],
  ): Promise<IcpScoreCount> {
    const updates = companies.flatMap((company) => {
      const update = this.buildUpdate(
        context,
        company,
        this.extractValues(context, { ...company }),
      );

      return isDefined(update) ? [{ id: company.id, update }] : [];
    });

    for (const { ids, update } of groupIcpScoreUpdates(updates)) {
      await context.companyRepository.update({ id: In(ids) }, update);
    }

    return { scoredCount: companies.length, updatedCount: updates.length };
  }

  private async scoreCandidates(
    context: IcpScoringContext,
    candidates: ProspectCandidateWorkspaceEntity[],
  ): Promise<IcpScoreCount> {
    const matchedCompanyIds = [
      ...new Set(
        candidates
          .map(({ matchedCompanyId }) => matchedCompanyId)
          .filter(isDefined),
      ),
    ];

    const matchedCompanies =
      matchedCompanyIds.length > 0
        ? await context.companyRepository.find({
            where: { id: In(matchedCompanyIds) },
          })
        : [];

    const matchedCompanyById = new Map(
      matchedCompanies.map((company) => [company.id, company]),
    );

    const updates = candidates.flatMap((candidate) => {
      const matchedCompany = isDefined(candidate.matchedCompanyId)
        ? matchedCompanyById.get(candidate.matchedCompanyId)
        : undefined;

      const candidateValues = this.extractValues(
        context,
        buildIcpCandidateAttributeRecord(candidate),
      );

      const values = isDefined(matchedCompany)
        ? mergeIcpAttributeValues({
            preferred: this.extractValues(context, { ...matchedCompany }),
            fallback: candidateValues,
          })
        : candidateValues;

      const update = this.buildUpdate(context, candidate, values);

      return isDefined(update) ? [{ id: candidate.id, update }] : [];
    });

    for (const { ids, update } of groupIcpScoreUpdates(updates)) {
      await context.candidateRepository.update({ id: In(ids) }, update);
    }

    return { scoredCount: candidates.length, updatedCount: updates.length };
  }

  private extractValues(
    context: IcpScoringContext,
    record: Record<string, unknown>,
  ): IcpAttributeValues {
    return extractIcpAttributeValues({
      record,
      attributes: context.attributes,
      referenceDate: context.scoredAt,
    });
  }

  private buildUpdate(
    context: IcpScoringContext,
    record: Omit<IcpScoreFields, 'icpScoredAt'>,
    values: IcpAttributeValues,
  ): IcpScoreFields | null {
    return buildIcpScoreUpdate({
      current: record,
      result: computeIcpScore({
        criteria: context.model.criteria ?? [],
        values,
        thresholds: context.model.tierThresholds ?? DEFAULT_ICP_TIER_THRESHOLDS,
      }),
      modelVersion: context.model.version,
      scoredAt: context.scoredAt,
    });
  }
}
