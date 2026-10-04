import { UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';
import { isDefined } from 'twenty-shared/utils';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { CreateMcpServerConnectionInput } from 'src/engine/core-modules/mcp-connection/dtos/create-mcp-server-connection.input';
import { McpRemoteToolDTO } from 'src/engine/core-modules/mcp-connection/dtos/mcp-remote-tool.dto';
import { McpServerConnectionDTO } from 'src/engine/core-modules/mcp-connection/dtos/mcp-server-connection.dto';
import { UpdateMcpServerConnectionInput } from 'src/engine/core-modules/mcp-connection/dtos/update-mcp-server-connection.input';
import { McpConnectionGraphqlApiExceptionInterceptor } from 'src/engine/core-modules/mcp-connection/interceptors/mcp-connection-graphql-api-exception.interceptor';
import { type McpServerConnectionEntity } from 'src/engine/core-modules/mcp-connection/entities/mcp-server-connection.entity';
import { McpServerConnectionAuthMethod } from 'src/engine/core-modules/mcp-connection/enums/mcp-server-connection-auth-method.enum';
import { McpServerConnectionStatus } from 'src/engine/core-modules/mcp-connection/enums/mcp-server-connection-status.enum';
import { McpClientService } from 'src/engine/core-modules/mcp-connection/services/mcp-client.service';
import { McpConnectionService } from 'src/engine/core-modules/mcp-connection/services/mcp-connection.service';

@UseGuards(WorkspaceAuthGuard)
@UseInterceptors(McpConnectionGraphqlApiExceptionInterceptor)
@MetadataResolver(() => McpServerConnectionDTO)
export class McpConnectionResolver {
  constructor(
    private readonly mcpConnectionService: McpConnectionService,
    private readonly mcpClientService: McpClientService,
  ) {}

  // A bad key should surface immediately on save rather than on the first
  // chat that tries to use the server.
  private async verifyApiKeyConnection(
    connection: McpServerConnectionEntity,
  ): Promise<McpServerConnectionEntity> {
    try {
      await this.mcpClientService.listTools(connection);

      return connection;
    } catch (error) {
      const reloaded = await this.mcpConnectionService.findByIdOrThrow(
        connection.id,
        connection.workspaceId,
      );

      if (reloaded.status !== McpServerConnectionStatus.ERROR) {
        await this.mcpConnectionService.markError(
          connection.id,
          error instanceof Error ? error.message : String(error),
        );
      }

      return this.mcpConnectionService.findByIdOrThrow(
        connection.id,
        connection.workspaceId,
      );
    }
  }

  @Query(() => [McpServerConnectionDTO])
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.MCP_SERVERS))
  async mcpServerConnections(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<McpServerConnectionDTO[]> {
    return await this.mcpConnectionService.findAllByWorkspace(workspace.id);
  }

  @Query(() => McpServerConnectionDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.MCP_SERVERS))
  async mcpServerConnection(
    @Args('id', { type: () => UUIDScalarType }) id: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<McpServerConnectionDTO> {
    return await this.mcpConnectionService.findByIdOrThrow(id, workspace.id);
  }

  // Workflow builders pick a connection and tool without needing the
  // settings-level MCP_SERVERS permission that manages connections.
  @Query(() => [McpServerConnectionDTO])
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.WORKFLOWS))
  async connectedMcpServerConnections(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<McpServerConnectionDTO[]> {
    const connections = await this.mcpConnectionService.findAllByWorkspace(
      workspace.id,
    );

    return connections.filter(
      (connection) => connection.status === McpServerConnectionStatus.CONNECTED,
    );
  }

  @Query(() => [McpRemoteToolDTO])
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.WORKFLOWS))
  async mcpServerConnectionTools(
    @Args('connectionId', { type: () => UUIDScalarType }) connectionId: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<McpRemoteToolDTO[]> {
    const connection = await this.mcpConnectionService.findByIdOrThrow(
      connectionId,
      workspace.id,
    );

    const remoteTools = await this.mcpClientService.listTools(connection);

    return remoteTools.map((remoteTool) => ({
      name: remoteTool.name,
      description: remoteTool.description ?? null,
      inputSchema: remoteTool.inputSchema ?? null,
    }));
  }

  @Mutation(() => McpServerConnectionDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.MCP_SERVERS))
  async createMcpServerConnection(
    @Args('input') input: CreateMcpServerConnectionInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<McpServerConnectionDTO> {
    const connection = await this.mcpConnectionService.create({
      workspaceId: workspace.id,
      name: input.name,
      serverUrl: input.serverUrl,
      apiKey: input.apiKey,
      manualOverrides: input.manualOverrides,
    });

    return connection.authMethod === McpServerConnectionAuthMethod.API_KEY
      ? await this.verifyApiKeyConnection(connection)
      : connection;
  }

  @Mutation(() => McpServerConnectionDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.MCP_SERVERS))
  async updateMcpServerConnection(
    @Args('input') input: UpdateMcpServerConnectionInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<McpServerConnectionDTO> {
    const updated = await this.mcpConnectionService.update(
      input.id,
      workspace.id,
      { name: input.name, serverUrl: input.serverUrl },
    );

    if (!isDefined(input.apiKey)) {
      return updated;
    }

    const withNewKey = await this.mcpConnectionService.replaceApiKey(
      input.id,
      workspace.id,
      input.apiKey,
    );

    return await this.verifyApiKeyConnection(withNewKey);
  }

  @Mutation(() => McpServerConnectionDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.MCP_SERVERS))
  async deleteMcpServerConnection(
    @Args('id', { type: () => UUIDScalarType }) id: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<McpServerConnectionDTO> {
    return await this.mcpConnectionService.delete(id, workspace.id);
  }
}
