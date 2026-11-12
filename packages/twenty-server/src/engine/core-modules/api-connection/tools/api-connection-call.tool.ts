import { Injectable } from '@nestjs/common';

import { z } from 'zod';

import { ApiConnectionClientService } from 'src/engine/core-modules/api-connection/services/api-connection-client.service';
import { ApiConnectionService } from 'src/engine/core-modules/api-connection/services/api-connection.service';
import { type ApiConnectionCallInput } from 'src/engine/core-modules/api-connection/tools/types/api-connection-call-input.type';
import { type ToolExecutionContext } from 'src/engine/core-modules/tool/types/tool-execution-context.type';
import { type ToolInput } from 'src/engine/core-modules/tool/types/tool-input.type';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { type Tool } from 'src/engine/core-modules/tool/types/tool.type';

export type ApiConnectionCallToolOutput = ToolOutput & {
  request?: { method: string; url: string } | null;
};

@Injectable()
export class ApiConnectionCallTool implements Tool {
  description = 'Call an operation on a connected external REST API.';
  inputSchema = z.object({
    connectionId: z.string(),
    operationName: z.string(),
    arguments: z.record(z.string(), z.unknown()).optional(),
  });

  constructor(
    private readonly apiConnectionService: ApiConnectionService,
    private readonly apiConnectionClientService: ApiConnectionClientService,
  ) {}

  async execute(
    parameters: ToolInput,
    context: ToolExecutionContext,
  ): Promise<ApiConnectionCallToolOutput> {
    const {
      connectionId,
      operationName,
      arguments: operationArguments,
    } = parameters as ApiConnectionCallInput;

    if (!connectionId || !operationName) {
      const message = 'API connection and operation are required';

      return { success: false, message, error: message };
    }

    try {
      const connection = await this.apiConnectionService.findByIdOrThrow(
        connectionId,
        context.workspaceId,
      );

      const { toolOutput, request } =
        await this.apiConnectionClientService.callOperation({
          connection,
          operationName,
          args: operationArguments ?? {},
        });

      return { ...toolOutput, request };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return { success: false, message, error: message };
    }
  }
}
