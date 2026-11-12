import { UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { ApiConnectionOperationToolDTO } from 'src/engine/core-modules/api-connection/dtos/api-connection-operation-tool.dto';
import { ApiConnectionTestResultDTO } from 'src/engine/core-modules/api-connection/dtos/api-connection-test-result.dto';
import { ApiConnectionDTO } from 'src/engine/core-modules/api-connection/dtos/api-connection.dto';
import { CreateApiConnectionInput } from 'src/engine/core-modules/api-connection/dtos/create-api-connection.input';
import { OpenApiImportPreviewDTO } from 'src/engine/core-modules/api-connection/dtos/open-api-import-preview.dto';
import { PreviewOpenApiImportInput } from 'src/engine/core-modules/api-connection/dtos/preview-open-api-import.input';
import { UpdateApiConnectionInput } from 'src/engine/core-modules/api-connection/dtos/update-api-connection.input';
import { ApiConnectionStatus } from 'src/engine/core-modules/api-connection/enums/api-connection-status.enum';
import { ApiConnectionGraphqlApiExceptionInterceptor } from 'src/engine/core-modules/api-connection/interceptors/api-connection-graphql-api-exception.interceptor';
import { ApiConnectionOpenApiImportService } from 'src/engine/core-modules/api-connection/services/api-connection-open-api-import.service';
import { ApiConnectionTestService } from 'src/engine/core-modules/api-connection/services/api-connection-test.service';
import { ApiConnectionService } from 'src/engine/core-modules/api-connection/services/api-connection.service';
import { buildApiOperationInputSchema } from 'src/engine/core-modules/api-connection/utils/build-api-operation-input-schema.util';
import { toApiConnectionDTO } from 'src/engine/core-modules/api-connection/utils/to-api-connection-dto.util';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

@UseGuards(WorkspaceAuthGuard)
@UseInterceptors(ApiConnectionGraphqlApiExceptionInterceptor)
@MetadataResolver(() => ApiConnectionDTO)
export class ApiConnectionResolver {
  constructor(
    private readonly apiConnectionService: ApiConnectionService,
    private readonly apiConnectionTestService: ApiConnectionTestService,
    private readonly apiConnectionOpenApiImportService: ApiConnectionOpenApiImportService,
  ) {}

  @Query(() => [ApiConnectionDTO])
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.MCP_SERVERS))
  async apiConnections(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<ApiConnectionDTO[]> {
    const connections = await this.apiConnectionService.findAllByWorkspace(
      workspace.id,
    );

    return connections.map(toApiConnectionDTO);
  }

  @Query(() => ApiConnectionDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.MCP_SERVERS))
  async apiConnection(
    @Args('id', { type: () => UUIDScalarType }) id: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<ApiConnectionDTO> {
    return toApiConnectionDTO(
      await this.apiConnectionService.findByIdOrThrow(id, workspace.id),
    );
  }

  // Workflow builders pick a connection and operation without needing the
  // settings-level permission that manages connections.
  @Query(() => [ApiConnectionDTO])
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.WORKFLOWS))
  async connectedApiConnections(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<ApiConnectionDTO[]> {
    const connections = await this.apiConnectionService.findAllByWorkspace(
      workspace.id,
    );

    return connections
      .filter(
        (connection) => connection.status === ApiConnectionStatus.CONNECTED,
      )
      .map(toApiConnectionDTO);
  }

  @Query(() => [ApiConnectionOperationToolDTO])
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.WORKFLOWS))
  async apiConnectionOperationTools(
    @Args('connectionId', { type: () => UUIDScalarType }) connectionId: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<ApiConnectionOperationToolDTO[]> {
    const connection = await this.apiConnectionService.findByIdOrThrow(
      connectionId,
      workspace.id,
    );

    return connection.operations
      .filter((operation) => operation.isEnabled)
      .map((operation) => ({
        name: operation.name,
        description: operation.description,
        method: operation.method,
        path: operation.path,
        inputSchema: buildApiOperationInputSchema(operation),
      }));
  }

  @Mutation(() => ApiConnectionDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.MCP_SERVERS))
  async createApiConnection(
    @Args('input') input: CreateApiConnectionInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<ApiConnectionDTO> {
    const connection = await this.apiConnectionService.create({
      ...input,
      workspaceId: workspace.id,
    });

    const { connection: tested } =
      await this.apiConnectionTestService.testConnection(connection);

    return toApiConnectionDTO(tested);
  }

  @Mutation(() => ApiConnectionDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.MCP_SERVERS))
  async updateApiConnection(
    @Args('input') input: UpdateApiConnectionInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<ApiConnectionDTO> {
    const { id, ...updates } = input;

    const { connection, needsRetest } = await this.apiConnectionService.update(
      id,
      workspace.id,
      updates,
    );

    if (!needsRetest) {
      return toApiConnectionDTO(connection);
    }

    const { connection: tested } =
      await this.apiConnectionTestService.testConnection(connection);

    return toApiConnectionDTO(tested);
  }

  @Mutation(() => ApiConnectionDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.MCP_SERVERS))
  async deleteApiConnection(
    @Args('id', { type: () => UUIDScalarType }) id: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<ApiConnectionDTO> {
    return toApiConnectionDTO(
      await this.apiConnectionService.delete(id, workspace.id),
    );
  }

  @Mutation(() => ApiConnectionTestResultDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.MCP_SERVERS))
  async testApiConnection(
    @Args('id', { type: () => UUIDScalarType }) id: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<ApiConnectionTestResultDTO> {
    const connection = await this.apiConnectionService.findByIdOrThrow(
      id,
      workspace.id,
    );

    const result =
      await this.apiConnectionTestService.testConnection(connection);

    return { ...result, connection: toApiConnectionDTO(result.connection) };
  }

  @Mutation(() => OpenApiImportPreviewDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.MCP_SERVERS))
  async previewOpenApiImport(
    @Args('input') input: PreviewOpenApiImportInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<OpenApiImportPreviewDTO> {
    return this.apiConnectionOpenApiImportService.preview({
      workspaceId: workspace.id,
      specUrl: input.specUrl,
      specJson: input.specJson,
    });
  }
}
