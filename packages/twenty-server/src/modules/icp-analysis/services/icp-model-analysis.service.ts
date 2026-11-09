import { Injectable } from '@nestjs/common';

import {
  computeIcpAttributePatterns,
  type IcpAttributeDefinition,
  type IcpCriterion,
  type IcpDatasetRow,
  suggestIcpCriterionWeights,
} from 'twenty-shared/icp-analysis';
import { isDefined } from 'twenty-shared/utils';
import { v4 } from 'uuid';

import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { type RolePermissionConfig } from 'src/engine/twenty-orm/types/role-permission-config';
import { IcpAnalysisException } from 'src/modules/icp-analysis/exceptions/icp-analysis.exception';
import { IcpEvidenceService } from 'src/modules/icp-analysis/services/icp-evidence.service';
import { IcpModelWorkspaceEntity } from 'src/modules/icp-analysis/standard-objects/icp-model.workspace-entity';
import { type IcpModelAnalysisSnapshot } from 'src/modules/icp-analysis/types/icp-model-analysis-snapshot.type';
import { isIcpModelAnalysisSnapshot } from 'src/modules/icp-analysis/utils/is-icp-model-analysis-snapshot.util';

type IcpModelActionArgs = {
  workspaceId: string;
  userWorkspaceId: string;
  modelId: string;
};

@Injectable()
export class IcpModelAnalysisService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly userRoleService: UserRoleService,
    private readonly icpEvidenceService: IcpEvidenceService,
  ) {}

  async analyze(
    args: IcpModelActionArgs,
  ): Promise<{ analysis: IcpModelAnalysisSnapshot; rows: IcpDatasetRow[] }> {
    return this.withModel(args, async ({ model, repository, permissions }) => {
      const evidence = await this.icpEvidenceService.buildEvidence({
        workspaceId: args.workspaceId,
        model,
        readPermissions: permissions,
      });

      const analyzedAt = new Date();

      const analysis: IcpModelAnalysisSnapshot = {
        analyzedAt: analyzedAt.toISOString(),
        window: evidence.window,
        excludedWithoutCompanyCount: evidence.excludedWithoutCompanyCount,
        isTruncated: evidence.isTruncated,
        attributes: evidence.attributes,
        patterns: computeIcpAttributePatterns({
          rows: evidence.rows,
          attributes: evidence.attributes,
        }),
      };

      await repository.update({ id: model.id }, { analysis, analyzedAt });

      return { analysis, rows: evidence.rows };
    });
  }

  async getEvidence(
    args: IcpModelActionArgs,
  ): Promise<{ attributes: IcpAttributeDefinition[]; rows: IcpDatasetRow[] }> {
    return this.withModel(args, async ({ model, permissions }) => {
      const { attributes, rows } = await this.icpEvidenceService.buildEvidence({
        workspaceId: args.workspaceId,
        model,
        readPermissions: permissions,
      });

      return { attributes, rows };
    });
  }

  // Suggestions come from the saved analysis, so they match the patterns the
  // user is looking at; nothing is saved until the user saves the criteria.
  async suggestCriteria(args: IcpModelActionArgs): Promise<IcpCriterion[]> {
    return this.withModel(args, async ({ model }) => {
      if (!isIcpModelAnalysisSnapshot(model.analysis)) {
        throw new IcpAnalysisException(
          `ICP model ${model.id} has no analysis yet`,
          'MODEL_NOT_ANALYZED',
        );
      }

      return suggestIcpCriterionWeights({
        analysis: model.analysis.patterns,
      });
    });
  }

  async duplicate(
    args: IcpModelActionArgs,
  ): Promise<{ modelId: string; version: number }> {
    return this.withModel(args, async ({ model, repository }) => {
      const modelId = v4();
      const version = (model.version ?? 1) + 1;

      await repository.insert({
        id: modelId,
        name: model.name,
        status: 'DRAFT',
        version,
        wonStages: model.wonStages,
        lostStages: model.lostStages,
        datasetStartDate: model.datasetStartDate,
        datasetEndDate: model.datasetEndDate,
        criteria: model.criteria,
        tierThresholds: model.tierThresholds,
        insights: model.insights,
      });

      return { modelId, version };
    });
  }

  private async withModel<TResult>(
    { workspaceId, userWorkspaceId, modelId }: IcpModelActionArgs,
    callback: (context: {
      model: IcpModelWorkspaceEntity;
      repository: WorkspaceRepository<IcpModelWorkspaceEntity>;
      permissions: RolePermissionConfig;
    }) => Promise<TResult>,
  ): Promise<TResult> {
    const roleId = await this.userRoleService.getRoleIdForUserWorkspace({
      workspaceId,
      userWorkspaceId,
    });

    const permissions: RolePermissionConfig = { unionOf: [roleId] };

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const repository = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          IcpModelWorkspaceEntity,
          permissions,
        );

        const model = await repository.findOne({ where: { id: modelId } });

        if (!isDefined(model)) {
          throw new IcpAnalysisException(
            `ICP model ${modelId} not found`,
            'MODEL_NOT_FOUND',
          );
        }

        return callback({ model, repository, permissions });
      },
    );
  }
}
