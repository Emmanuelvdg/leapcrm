import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { AddWorkspaceAiProviderInput } from 'src/engine/metadata-modules/ai/ai-models/dtos/add-workspace-ai-provider.input';
import { UpdateWorkspaceAiProviderInput } from 'src/engine/metadata-modules/ai/ai-models/dtos/update-workspace-ai-provider.input';
import { WorkspaceAiProviderDTO } from 'src/engine/metadata-modules/ai/ai-models/dtos/workspace-ai-provider.dto';
import { AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';
import { WorkspaceAiProviderService } from 'src/engine/metadata-modules/ai/ai-models/services/workspace-ai-provider.service';

@UseGuards(
  WorkspaceAuthGuard,
  SettingsPermissionGuard(PermissionFlagType.AI_SETTINGS),
)
@MetadataResolver()
export class WorkspaceAiProviderResolver {
  constructor(
    private readonly workspaceAiProviderService: WorkspaceAiProviderService,
    private readonly aiModelRegistryService: AiModelRegistryService,
  ) {}

  @Query(() => [WorkspaceAiProviderDTO])
  async getWorkspaceAiProviders(
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
  ): Promise<WorkspaceAiProviderDTO[]> {
    const rows =
      await this.workspaceAiProviderService.findAllByWorkspace(workspaceId);

    return rows.map((row) => this.workspaceAiProviderService.toDTO(row));
  }

  @Mutation(() => WorkspaceAiProviderDTO)
  async addWorkspaceAiProvider(
    @Args('input') input: AddWorkspaceAiProviderInput,
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
  ): Promise<WorkspaceAiProviderDTO> {
    const created = await this.workspaceAiProviderService.create(
      workspaceId,
      input,
    );

    this.aiModelRegistryService.invalidateWorkspaceRegistry(workspaceId);

    return this.workspaceAiProviderService.toDTO(created);
  }

  @Mutation(() => WorkspaceAiProviderDTO)
  async updateWorkspaceAiProvider(
    @Args('input') input: UpdateWorkspaceAiProviderInput,
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
  ): Promise<WorkspaceAiProviderDTO> {
    const updated = await this.workspaceAiProviderService.update(
      workspaceId,
      input,
    );

    this.aiModelRegistryService.invalidateWorkspaceRegistry(workspaceId);

    return this.workspaceAiProviderService.toDTO(updated);
  }

  @Mutation(() => Boolean)
  async removeWorkspaceAiProvider(
    @Args('id') id: string,
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
  ): Promise<boolean> {
    const removed = await this.workspaceAiProviderService.remove(
      workspaceId,
      id,
    );

    this.aiModelRegistryService.invalidateWorkspaceRegistry(workspaceId);

    return removed;
  }
}
