import { Test, type TestingModule } from '@nestjs/testing';

import { type McpServerConnectionEntity } from 'src/engine/core-modules/mcp-connection/entities/mcp-server-connection.entity';
import { McpClientService } from 'src/engine/core-modules/mcp-connection/services/mcp-client.service';
import { McpConnectionService } from 'src/engine/core-modules/mcp-connection/services/mcp-connection.service';
import { McpToolCallTool } from 'src/engine/core-modules/mcp-connection/tools/mcp-tool-call.tool';

const connection = {
  id: 'connection-1',
  workspaceId: 'workspace-1',
} as McpServerConnectionEntity;

describe('McpToolCallTool', () => {
  let tool: McpToolCallTool;
  let findByIdOrThrow: jest.Mock;
  let callTool: jest.Mock;

  beforeEach(async () => {
    findByIdOrThrow = jest.fn().mockResolvedValue(connection);
    callTool = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpToolCallTool,
        { provide: McpConnectionService, useValue: { findByIdOrThrow } },
        { provide: McpClientService, useValue: { callTool } },
      ],
    }).compile();

    tool = module.get(McpToolCallTool);
  });

  it('parses a JSON text response into a structured result', async () => {
    callTool.mockResolvedValue({ success: true, message: '{"total":3}' });

    const output = await tool.execute(
      {
        connectionId: 'connection-1',
        toolName: 'count',
        arguments: { a: 1 },
      },
      { workspaceId: 'workspace-1' },
    );

    expect(findByIdOrThrow).toHaveBeenCalledWith('connection-1', 'workspace-1');
    expect(callTool).toHaveBeenCalledWith(connection, 'count', { a: 1 });
    expect(output.result).toEqual({ total: 3 });
  });

  it('wraps a plain text response under text', async () => {
    callTool.mockResolvedValue({ success: true, message: 'Done' });

    const output = await tool.execute(
      { connectionId: 'connection-1', toolName: 'ping' },
      { workspaceId: 'workspace-1' },
    );

    expect(callTool).toHaveBeenCalledWith(connection, 'ping', {});
    expect(output.result).toEqual({ text: 'Done' });
  });

  it('fails without calling the server when the tool is not configured', async () => {
    const output = await tool.execute(
      { connectionId: 'connection-1', toolName: '' },
      { workspaceId: 'workspace-1' },
    );

    expect(output.success).toBe(false);
    expect(callTool).not.toHaveBeenCalled();
  });

  it('turns a thrown connection error into a failed output', async () => {
    findByIdOrThrow.mockRejectedValue(new Error('Connection not found'));

    const output = await tool.execute(
      { connectionId: 'missing', toolName: 'ping' },
      { workspaceId: 'workspace-1' },
    );

    expect(output).toEqual({
      success: false,
      message: 'Connection not found',
      error: 'Connection not found',
    });
  });
});
