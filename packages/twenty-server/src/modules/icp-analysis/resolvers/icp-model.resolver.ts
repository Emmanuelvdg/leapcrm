import { UseGuards, UseInterceptors, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';
import { FeatureFlagKey } from 'twenty-shared/types';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import {
  FeatureFlagGuard,
  RequireFeatureFlag,
} from 'src/engine/guards/feature-flag.guard';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { ActivatedIcpModelDTO } from 'src/modules/icp-analysis/dtos/activated-icp-model.dto';
import { DuplicatedIcpModelDTO } from 'src/modules/icp-analysis/dtos/duplicated-icp-model.dto';
import { IcpModelAnalysisDTO } from 'src/modules/icp-analysis/dtos/icp-model-analysis.dto';
import { IcpModelEvidenceDTO } from 'src/modules/icp-analysis/dtos/icp-model-evidence.dto';
import { IcpModelIdInput } from 'src/modules/icp-analysis/dtos/icp-model-id.input';
import { IcpSuggestedCriteriaDTO } from 'src/modules/icp-analysis/dtos/icp-suggested-criteria.dto';
import { IcpAnalysisGraphqlApiExceptionInterceptor } from 'src/modules/icp-analysis/interceptors/icp-analysis-graphql-api-exception.interceptor';
import { IcpModelAnalysisService } from 'src/modules/icp-analysis/services/icp-model-analysis.service';

@UseGuards(
  WorkspaceAuthGuard,
  FeatureFlagGuard,
  SettingsPermissionGuard(PermissionFlagType.ICP_ANALYSIS),
)
@UseInterceptors(IcpAnalysisGraphqlApiExceptionInterceptor)
@UsePipes(ResolverValidationPipe)
@MetadataResolver()
export class IcpModelResolver {
  constructor(
    private readonly icpModelAnalysisService: IcpModelAnalysisService,
  ) {}

  @Mutation(() => IcpModelAnalysisDTO)
  @RequireFeatureFlag(FeatureFlagKey.IS_ICP_ANALYSIS_ENABLED)
  async analyzeIcpModel(
    @Args('input') input: IcpModelIdInput,
    @AuthWorkspace() currentWorkspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<IcpModelAnalysisDTO> {
    const { analysis, rows } = await this.icpModelAnalysisService.analyze({
      workspaceId: currentWorkspace.id,
      userWorkspaceId,
      modelId: input.modelId,
    });

    return { modelId: input.modelId, analysis, rows };
  }

  @Query(() => IcpModelEvidenceDTO)
  @RequireFeatureFlag(FeatureFlagKey.IS_ICP_ANALYSIS_ENABLED)
  async icpModelEvidence(
    @Args('input') input: IcpModelIdInput,
    @AuthWorkspace() currentWorkspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<IcpModelEvidenceDTO> {
    const { attributes, rows } = await this.icpModelAnalysisService.getEvidence(
      {
        workspaceId: currentWorkspace.id,
        userWorkspaceId,
        modelId: input.modelId,
      },
    );

    return { modelId: input.modelId, attributes, rows };
  }

  @Mutation(() => IcpSuggestedCriteriaDTO)
  @RequireFeatureFlag(FeatureFlagKey.IS_ICP_ANALYSIS_ENABLED)
  async suggestIcpModelCriteria(
    @Args('input') input: IcpModelIdInput,
    @AuthWorkspace() currentWorkspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<IcpSuggestedCriteriaDTO> {
    const criteria = await this.icpModelAnalysisService.suggestCriteria({
      workspaceId: currentWorkspace.id,
      userWorkspaceId,
      modelId: input.modelId,
    });

    return { modelId: input.modelId, criteria };
  }

  @Mutation(() => DuplicatedIcpModelDTO)
  @RequireFeatureFlag(FeatureFlagKey.IS_ICP_ANALYSIS_ENABLED)
  async duplicateIcpModel(
    @Args('input') input: IcpModelIdInput,
    @AuthWorkspace() currentWorkspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<DuplicatedIcpModelDTO> {
    return this.icpModelAnalysisService.duplicate({
      workspaceId: currentWorkspace.id,
      userWorkspaceId,
      modelId: input.modelId,
    });
  }

  @Mutation(() => ActivatedIcpModelDTO)
  @RequireFeatureFlag(FeatureFlagKey.IS_ICP_ANALYSIS_ENABLED)
  async activateIcpModel(
    @Args('input') input: IcpModelIdInput,
    @AuthWorkspace() currentWorkspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<ActivatedIcpModelDTO> {
    return this.icpModelAnalysisService.activate({
      workspaceId: currentWorkspace.id,
      userWorkspaceId,
      modelId: input.modelId,
    });
  }
}
