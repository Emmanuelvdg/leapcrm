import { Injectable, Logger } from '@nestjs/common';

import { ToolCategory } from 'twenty-shared/ai';
import { PermissionFlagType } from 'twenty-shared/constants';

import { type GenerateDescriptorOptions } from 'src/engine/core-modules/tool-provider/interfaces/generate-descriptor-options.type';
import { type ToolProvider } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider.interface';
import { type ToolProviderContext } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider-context.type';
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

// Tool names must be unique across every connected server in the workspace —
// the sanitized connection name alone can collide (two connections named the
// same), so the connection's own id is appended as a short, always-unique
// suffix. The dispatch-time `executionRef.toolId` instead encodes
// `${connectionId}::${remoteToolName}` directly (not derived from `name`),
// so this sanitization only has to satisfy readability, not round-tripping.
const sanitizeToolNameSegment = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const TOOL_ID_SEPARATOR = '::';

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

        const connectionSlug = sanitizeToolNameSegment(connection.name);

        return remoteTools.map(
          (remoteTool): ToolIndexEntry | ToolDescriptor => {
            const name = `${connectionSlug}_${sanitizeToolNameSegment(remoteTool.name)}_${connection.id.replace(/-/g, '').slice(0, 8)}`;

            const base: ToolIndexEntry = {
              name,
              label: humanizeToolName(remoteTool.name),
              description: remoteTool.description || connection.name,
              category: ToolCategory.MCP_SERVER,
              executionRef: {
                kind: 'static',
                toolId: `${connection.id}${TOOL_ID_SEPARATOR}${remoteTool.name}`,
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
    const separatorIndex = toolName.indexOf(TOOL_ID_SEPARATOR);

    if (separatorIndex === -1) {
      throw new McpConnectionException(
        `Malformed MCP tool id "${toolName}"`,
        McpConnectionExceptionCode.TOOL_NOT_FOUND,
      );
    }

    const connectionId = toolName.slice(0, separatorIndex);
    const remoteToolName = toolName.slice(
      separatorIndex + TOOL_ID_SEPARATOR.length,
    );

    const connection = await this.mcpConnectionService.findByIdOrThrow(
      connectionId,
      context.workspaceId,
    );

    return this.mcpClientService.callTool(connection, remoteToolName, args);
  }
}
