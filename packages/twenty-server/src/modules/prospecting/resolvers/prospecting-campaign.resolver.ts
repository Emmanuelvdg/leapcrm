import { UseGuards, UseInterceptors, UsePipes } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';

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
import { ProspectingCampaignIdInput } from 'src/modules/prospecting/dtos/prospecting-campaign-id.input';
import { ProspectingCampaignStatusDTO } from 'src/modules/prospecting/dtos/prospecting-campaign-status.dto';
import { ProspectingGraphqlApiExceptionInterceptor } from 'src/modules/prospecting/interceptors/prospecting-graphql-api-exception.interceptor';
import { ProspectingCampaignService } from 'src/modules/prospecting/services/prospecting-campaign.service';

@UseGuards(
  WorkspaceAuthGuard,
  FeatureFlagGuard,
  SettingsPermissionGuard(PermissionFlagType.PROSPECTING),
)
@UseInterceptors(ProspectingGraphqlApiExceptionInterceptor)
@UsePipes(ResolverValidationPipe)
@MetadataResolver()
export class ProspectingCampaignResolver {
  constructor(
    private readonly prospectingCampaignService: ProspectingCampaignService,
  ) {}

  @Mutation(() => ProspectingCampaignStatusDTO)
  @RequireFeatureFlag(FeatureFlagKey.IS_PROSPECTING_ENABLED)
  async startProspectingCampaign(
    @Args('input') input: ProspectingCampaignIdInput,
    @AuthWorkspace() currentWorkspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<ProspectingCampaignStatusDTO> {
    return this.prospectingCampaignService.start({
      workspaceId: currentWorkspace.id,
      userWorkspaceId,
      campaignId: input.campaignId,
    });
  }

  @Mutation(() => ProspectingCampaignStatusDTO)
  @RequireFeatureFlag(FeatureFlagKey.IS_PROSPECTING_ENABLED)
  async pauseProspectingCampaign(
    @Args('input') input: ProspectingCampaignIdInput,
    @AuthWorkspace() currentWorkspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<ProspectingCampaignStatusDTO> {
    return this.prospectingCampaignService.pause({
      workspaceId: currentWorkspace.id,
      userWorkspaceId,
      campaignId: input.campaignId,
    });
  }

  @Mutation(() => ProspectingCampaignStatusDTO)
  @RequireFeatureFlag(FeatureFlagKey.IS_PROSPECTING_ENABLED)
  async resumeProspectingCampaign(
    @Args('input') input: ProspectingCampaignIdInput,
    @AuthWorkspace() currentWorkspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<ProspectingCampaignStatusDTO> {
    return this.prospectingCampaignService.resume({
      workspaceId: currentWorkspace.id,
      userWorkspaceId,
      campaignId: input.campaignId,
    });
  }

  @Mutation(() => ProspectingCampaignStatusDTO)
  @RequireFeatureFlag(FeatureFlagKey.IS_PROSPECTING_ENABLED)
  async cancelProspectingCampaign(
    @Args('input') input: ProspectingCampaignIdInput,
    @AuthWorkspace() currentWorkspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<ProspectingCampaignStatusDTO> {
    return this.prospectingCampaignService.cancel({
      workspaceId: currentWorkspace.id,
      userWorkspaceId,
      campaignId: input.campaignId,
    });
  }
}
