import { Injectable, Logger } from '@nestjs/common';

import { ToolCategory } from 'twenty-shared/ai';
import { PermissionFlagType } from 'twenty-shared/constants';
import { isDefined } from 'twenty-shared/utils';

import { type GenerateDescriptorOptions } from 'src/engine/core-modules/tool-provider/interfaces/generate-descriptor-options.type';
import { type ToolProvider } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider.interface';
import { type ToolProviderContext } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider-context.type';
import {
  buildConnectionToolId,
  buildConnectionToolName,
  parseConnectionToolId,
} from 'src/engine/core-modules/tool-provider/utils/connection-tool-name.util';
import { humanizeToolName } from 'src/engine/core-modules/tool-provider/utils/tool-set-to-descriptors.util';
import { type ToolDescriptor } from 'src/engine/core-modules/tool-provider/types/tool-descriptor.type';
import { type ToolIndexEntry } from 'src/engine/core-modules/tool-provider/types/tool-index-entry.type';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { McpServerConnectionStatus } from 'src/engine/core-modules/mcp-connection/enums/mcp-server-connection-status.enum';
import { McpConnectionExceptionCode } from 'src/engine/core-modules/mcp-connection/mcp-connection-exception-code.enum';
import { McpConnectionException } from 'src/engine/core-modules/mcp-connection/mcp-connection.exception';
import { McpClientService } from 'src/engine/core-modules/mcp-connection/services/mcp-client.service';
import { McpConnectionService } from 'src/engine/core-modules/mcp-connection/services/mcp-connection.service';
import { type McpRemoteTool } from 'src/engine/core-modules/mcp-connection/types/mcp-remote-tool.type';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

@Injectable()
export class McpConnectionToolProvider implements ToolProvider {
  readonly category = ToolCategory.MCP_SERVER;

  private readonly logger = new Logger(McpConnectionToolProvider.name);

  constructor(
    private readonly mcpConnectionService: McpConnectionService,
    private readonly mcpClientService: McpClientService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async isAvailable(context: ToolProviderContext): Promise<boolean> {
    return this.permissionsService.checkRolesPermissions(
      context.rolePermissionConfig,
      context.workspaceId,
      PermissionFlagType.MCP_SERVERS,
    );
  }

  async generateDescriptors(
    context: ToolProviderContext,
    options?: GenerateDescriptorOptions,
  ): Promise<(ToolIndexEntry | ToolDescriptor)[]> {
    const includeSchemas = options?.includeSchemas ?? true;

    const connections = (
      await this.mcpConnectionService.findAllByWorkspace(context.workspaceId)
    ).filter(
      (connection) => connection.status === McpServerConnectionStatus.CONNECTED,
    );

    const descriptorsByConnection = await Promise.all(
      connections.map(async (connection) => {
        let remoteTools: McpRemoteTool[];

        try {
          remoteTools = await this.mcpClientService.listTools(connection);
        } catch (error) {
          this.logger.warn(
            `Failed to list tools for MCP connection ${connection.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );

          return [];
        }

        return remoteTools.map(
          (remoteTool): ToolIndexEntry | ToolDescriptor => {
            const name = buildConnectionToolName({
              connectionId: connection.id,
              connectionName: connection.name,
              toolName: remoteTool.name,
            });

            const base: ToolIndexEntry = {
              name,
              label: humanizeToolName(remoteTool.name),
              description: remoteTool.description || connection.name,
              category: ToolCategory.MCP_SERVER,
              executionRef: {
                kind: 'static',
                toolId: buildConnectionToolId(connection.id, remoteTool.name),
              },
            };

            if (!includeSchemas) {
              return base;
            }

            return { ...base, inputSchema: remoteTool.inputSchema };
          },
        );
      }),
    );

    return descriptorsByConnection.flat();
  }

  async executeStaticTool(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolProviderContext,
  ): Promise<ToolOutput> {
    const parsedToolId = parseConnectionToolId(toolName);

    if (!isDefined(parsedToolId)) {
      throw new McpConnectionException(
        `Malformed MCP tool id "${toolName}"`,
        McpConnectionExceptionCode.TOOL_NOT_FOUND,
      );
    }

    const { connectionId, toolName: remoteToolName } = parsedToolId;

    const connection = await this.mcpConnectionService.findByIdOrThrow(
      connectionId,
      context.workspaceId,
    );

    return this.mcpClientService.callTool(connection, remoteToolName, args);
  }
}
