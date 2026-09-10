import { Injectable, NotFoundException } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { SecretEncryptionService } from 'src/engine/core-modules/secret-encryption/secret-encryption.service';
import { type PlaintextString } from 'src/engine/core-modules/secret-encryption/branded-strings/plaintext-string.type';
import { type EncryptedString } from 'src/engine/core-modules/secret-encryption/branded-strings/encrypted-string.type';
import { type AddWorkspaceAiProviderInput } from 'src/engine/metadata-modules/ai/ai-models/dtos/add-workspace-ai-provider.input';
import { type UpdateWorkspaceAiProviderInput } from 'src/engine/metadata-modules/ai/ai-models/dtos/update-workspace-ai-provider.input';
import { type WorkspaceAiProviderDTO } from 'src/engine/metadata-modules/ai/ai-models/dtos/workspace-ai-provider.dto';
import { WorkspaceAiProviderEntity } from 'src/engine/metadata-modules/ai/ai-models/entities/workspace-ai-provider.entity';
import { type AiProviderConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-provider-config.type';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';

@Injectable()
export class WorkspaceAiProviderService {
  constructor(
    @InjectWorkspaceScopedRepository(WorkspaceAiProviderEntity)
    private readonly repository: WorkspaceScopedRepository<WorkspaceAiProviderEntity>,
    private readonly secretEncryptionService: SecretEncryptionService,
  ) {}

  async findAllByWorkspace(
    workspaceId: string,
  ): Promise<WorkspaceAiProviderEntity[]> {
    return this.repository.find(workspaceId, { order: { createdAt: 'ASC' } });
  }

  // Internal only — resolves stored providers into the generic AiProviderConfig
  // shape (with a decrypted apiKey) for the AiModelRegistryService overlay.
  // Never expose the return value over GraphQL.
  async getResolvedProvidersForWorkspace(
    workspaceId: string,
  ): Promise<Record<string, AiProviderConfig>> {
    const rows = await this.findAllByWorkspace(workspaceId);
    const result: Record<string, AiProviderConfig> = {};

    for (const row of rows) {
      result[row.providerName] = {
        npm: row.npm,
        label: row.label,
        name: row.providerName,
        baseUrl: row.baseUrl ?? undefined,
        apiKey: isDefined(row.apiKey)
          ? (this.secretEncryptionService.decryptVersionedOrThrow(row.apiKey, {
              workspaceId,
            }) as unknown as string)
          : undefined,
        models: row.models,
      };
    }

    return result;
  }

  async create(
    workspaceId: string,
    input: AddWorkspaceAiProviderInput,
  ): Promise<WorkspaceAiProviderEntity> {
    return this.repository.insertAndReturnOne(workspaceId, {
      providerName: input.providerName,
      npm: input.npm,
      label: input.label,
      baseUrl: input.baseUrl ?? null,
      apiKey: isDefined(input.apiKey)
        ? this.encryptApiKey(input.apiKey, workspaceId)
        : null,
      models: input.models ?? [],
    });
  }

  async update(
    workspaceId: string,
    input: UpdateWorkspaceAiProviderInput,
  ): Promise<WorkspaceAiProviderEntity> {
    await this.repository.update(
      workspaceId,
      { id: input.id },
      {
        ...(isDefined(input.label) && { label: input.label }),
        ...(isDefined(input.baseUrl) && { baseUrl: input.baseUrl }),
        ...(isDefined(input.apiKey) && {
          apiKey: this.encryptApiKey(input.apiKey, workspaceId),
        }),
        ...(isDefined(input.models) && { models: input.models }),
      },
    );

    const updated = await this.repository.findOneBy(workspaceId, {
      id: input.id,
    });

    if (!isDefined(updated)) {
      throw new NotFoundException(
        `Workspace AI provider ${input.id} not found`,
      );
    }

    return updated;
  }

  async remove(workspaceId: string, id: string): Promise<boolean> {
    const { affected } = await this.repository.delete(workspaceId, { id });

    return (affected ?? 0) > 0;
  }

  toDTO(entity: WorkspaceAiProviderEntity): WorkspaceAiProviderDTO {
    return {
      id: entity.id,
      providerName: entity.providerName,
      npm: entity.npm,
      label: entity.label,
      baseUrl: entity.baseUrl ?? undefined,
      hasApiKey: isDefined(entity.apiKey),
      models: entity.models,
      workspaceId: entity.workspaceId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private encryptApiKey(
    apiKey: string,
    workspaceId: string,
  ): EncryptedString {
    return this.secretEncryptionService.encryptVersioned(
      apiKey as PlaintextString,
      { workspaceId },
    );
  }
}
