import { Injectable } from '@nestjs/common';

import { z } from 'zod';

import { type McpToolCallInput } from 'src/engine/core-modules/mcp-connection/tools/types/mcp-tool-call-input.type';
import { McpClientService } from 'src/engine/core-modules/mcp-connection/services/mcp-client.service';
import { McpConnectionService } from 'src/engine/core-modules/mcp-connection/services/mcp-connection.service';
import { type ToolExecutionContext } from 'src/engine/core-modules/tool/types/tool-execution-context.type';
import { type ToolInput } from 'src/engine/core-modules/tool/types/tool-input.type';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { type Tool } from 'src/engine/core-modules/tool/types/tool.type';

const parseToolCallText = (text: string): object => {
  try {
    const parsed: unknown = JSON.parse(text);

    if (parsed !== null && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // Non-JSON text output is exposed as-is under `text`.
  }

  return { text };
};

@Injectable()
export class McpToolCallTool implements Tool {
  description = 'Call a tool on a connected external MCP server.';
  inputSchema = z.object({
    connectionId: z.string(),
    toolName: z.string(),
    arguments: z.record(z.string(), z.unknown()).optional(),
  });

  constructor(
    private readonly mcpConnectionService: McpConnectionService,
    private readonly mcpClientService: McpClientService,
  ) {}

  async execute(
    parameters: ToolInput,
    context: ToolExecutionContext,
  ): Promise<ToolOutput> {
    const {
      connectionId,
      toolName,
      arguments: toolArguments,
    } = parameters as McpToolCallInput;

    if (!connectionId || !toolName) {
      return {
        success: false,
        message: 'MCP server connection and tool are required',
        error: 'MCP server connection and tool are required',
      };
    }

    try {
      const connection = await this.mcpConnectionService.findByIdOrThrow(
        connectionId,
        context.workspaceId,
      );

      const output = await this.mcpClientService.callTool(
        connection,
        toolName,
        toolArguments ?? {},
      );

      return { ...output, result: parseToolCallText(output.message) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return { success: false, message, error: message };
    }
  }
}
