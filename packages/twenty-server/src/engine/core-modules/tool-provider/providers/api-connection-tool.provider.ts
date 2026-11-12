import { Injectable } from '@nestjs/common';

import { ToolCategory } from 'twenty-shared/ai';
import { PermissionFlagType } from 'twenty-shared/constants';
import { isDefined } from 'twenty-shared/utils';

import { ApiConnectionExceptionCode } from 'src/engine/core-modules/api-connection/api-connection-exception-code.enum';
import { ApiConnectionException } from 'src/engine/core-modules/api-connection/api-connection.exception';
import { ApiConnectionStatus } from 'src/engine/core-modules/api-connection/enums/api-connection-status.enum';
import { ApiConnectionClientService } from 'src/engine/core-modules/api-connection/services/api-connection-client.service';
import { ApiConnectionService } from 'src/engine/core-modules/api-connection/services/api-connection.service';
import { buildApiOperationInputSchema } from 'src/engine/core-modules/api-connection/utils/build-api-operation-input-schema.util';
import { type GenerateDescriptorOptions } from 'src/engine/core-modules/tool-provider/interfaces/generate-descriptor-options.type';
import { type ToolProviderContext } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider-context.type';
import { type ToolProvider } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider.interface';
import { type ToolDescriptor } from 'src/engine/core-modules/tool-provider/types/tool-descriptor.type';
import { type ToolIndexEntry } from 'src/engine/core-modules/tool-provider/types/tool-index-entry.type';
import {
  buildConnectionToolId,
  buildConnectionToolName,
  parseConnectionToolId,
} from 'src/engine/core-modules/tool-provider/utils/connection-tool-name.util';
import { humanizeToolName } from 'src/engine/core-modules/tool-provider/utils/tool-set-to-descriptors.util';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

@Injectable()
export class ApiConnectionToolProvider implements ToolProvider {
  readonly category = ToolCategory.API_CONNECTION;

  constructor(
    private readonly apiConnectionService: ApiConnectionService,
    private readonly apiConnectionClientService: ApiConnectionClientService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async isAvailable(context: ToolProviderContext): Promise<boolean> {
    return this.permissionsService.checkRolesPermissions(
      context.rolePermissionConfig,
      context.workspaceId,
      PermissionFlagType.MCP_SERVERS,
    );
  }

  // Operations are stored on the connection, so unlike MCP no network call is
  // needed to build the catalog.
  async generateDescriptors(
    context: ToolProviderContext,
    options?: GenerateDescriptorOptions,
  ): Promise<(ToolIndexEntry | ToolDescriptor)[]> {
    const includeSchemas = options?.includeSchemas ?? true;

    const connections = await this.apiConnectionService.findAllByWorkspace(
      context.workspaceId,
    );

    return connections
      .filter(
        (connection) => connection.status === ApiConnectionStatus.CONNECTED,
      )
      .flatMap((connection) =>
        connection.operations
          .filter((operation) => operation.isEnabled)
          .map((operation): ToolIndexEntry | ToolDescriptor => {
            const base: ToolIndexEntry = {
              name: buildConnectionToolName({
                connectionId: connection.id,
                connectionName: connection.name,
                toolName: operation.name,
              }),
              label: humanizeToolName(operation.name),
              description: `${connection.name}: ${
                operation.description || `${operation.method} ${operation.path}`
              }`,
              category: ToolCategory.API_CONNECTION,
              executionRef: {
                kind: 'static',
                toolId: buildConnectionToolId(connection.id, operation.name),
              },
            };

            if (!includeSchemas) {
              return base;
            }

            return {
              ...base,
              inputSchema: buildApiOperationInputSchema(operation),
            };
          }),
      )
      .filter(
        (descriptor) =>
          !isDefined(options?.toolNames) ||
          options.toolNames.has(descriptor.name),
      );
  }

  async executeStaticTool(
    toolId: string,
    args: Record<string, unknown>,
    context: ToolProviderContext,
  ): Promise<ToolOutput> {
    const parsedToolId = parseConnectionToolId(toolId);

    if (!isDefined(parsedToolId)) {
      throw new ApiConnectionException(
        `Malformed API connection tool id "${toolId}"`,
        ApiConnectionExceptionCode.OPERATION_NOT_FOUND,
      );
    }

    const connection = await this.apiConnectionService.findByIdOrThrow(
      parsedToolId.connectionId,
      context.workspaceId,
    );

    const { toolOutput } = await this.apiConnectionClientService.callOperation({
      connection,
      operationName: parsedToolId.toolName,
      args,
    });

    return toolOutput;
  }
}
