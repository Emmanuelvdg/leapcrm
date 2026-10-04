import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type McpServerConnectionEntity } from 'src/engine/core-modules/mcp-connection/entities/mcp-server-connection.entity';
import { McpServerConnectionAuthMethod } from 'src/engine/core-modules/mcp-connection/enums/mcp-server-connection-auth-method.enum';
import { McpConnectionExceptionCode } from 'src/engine/core-modules/mcp-connection/mcp-connection-exception-code.enum';
import { McpConnectionException } from 'src/engine/core-modules/mcp-connection/mcp-connection.exception';
import { McpConnectionService } from 'src/engine/core-modules/mcp-connection/services/mcp-connection.service';
import { McpConnectionTokenRefreshService } from 'src/engine/core-modules/mcp-connection/services/mcp-connection-token-refresh.service';
import { type McpRemoteTool } from 'src/engine/core-modules/mcp-connection/types/mcp-remote-tool.type';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';

const MCP_PROTOCOL_VERSION = '2025-06-18';
const MCP_REQUEST_ID = 1;

type JsonRpcSuccess<TResult> = { jsonrpc: '2.0'; id: number; result: TResult };
type JsonRpcError = {
  jsonrpc: '2.0';
  id: number;
  error: { code: number; message: string };
};
type JsonRpcResponse<TResult> = JsonRpcSuccess<TResult> | JsonRpcError;

type ToolCallResult = {
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
};

type SessionContext = { sessionId: string | null };

@Injectable()
export class McpClientService {
  constructor(
    private readonly mcpConnectionService: McpConnectionService,
    private readonly mcpConnectionTokenRefreshService: McpConnectionTokenRefreshService,
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {}

  async listTools(
    connection: McpServerConnectionEntity,
  ): Promise<McpRemoteTool[]> {
    const result = await this.request<{ tools: McpRemoteTool[] }>(
      connection,
      'tools/list',
    );

    return result.tools;
  }

  async callTool(
    connection: McpServerConnectionEntity,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<ToolOutput> {
    const result = await this.request<ToolCallResult>(
      connection,
      'tools/call',
      { name: toolName, arguments: args },
    );

    const text = result.content
      ?.filter((block) => block.type === 'text' && isDefined(block.text))
      .map((block) => block.text)
      .join('\n');

    return {
      success: result.isError !== true,
      message: text ?? '',
      ...(result.isError === true && { error: text ?? 'Tool call failed' }),
    };
  }

  private async request<TResult>(
    connection: McpServerConnectionEntity,
    method: string,
    params?: Record<string, unknown>,
  ): Promise<TResult> {
    let accessToken =
      this.mcpConnectionService.getDecryptedAccessToken(connection);

    let response = await this.send(
      connection.serverUrl,
      accessToken,
      method,
      params,
    );

    if (
      response.status === 401 &&
      connection.authMethod === McpServerConnectionAuthMethod.API_KEY
    ) {
      await this.mcpConnectionService.markError(
        connection.id,
        'The MCP server rejected the API key (401). Replace the key to reconnect.',
      );
    }

    if (
      response.status === 401 &&
      connection.authMethod === McpServerConnectionAuthMethod.OAUTH
    ) {
      accessToken =
        await this.mcpConnectionTokenRefreshService.refreshAndPersist(
          connection,
        );
      response = await this.send(
        connection.serverUrl,
        accessToken,
        method,
        params,
      );
    }

    if (!response.ok) {
      const text = await response.text();

      throw new McpConnectionException(
        `MCP server ${connection.serverUrl} responded with ${response.status} for ${method}: ${text.slice(0, 500)}`,
        McpConnectionExceptionCode.MCP_REQUEST_FAILED,
      );
    }

    const body = await this.readJsonRpcResponse<TResult>(
      response,
      connection.serverUrl,
      method,
    );

    if ('error' in body) {
      throw new McpConnectionException(
        `MCP server ${connection.serverUrl} returned an error for ${method}: ${body.error.message}`,
        McpConnectionExceptionCode.MCP_REQUEST_FAILED,
      );
    }

    return body.result;
  }

  // Streamable HTTP handshake: initialize, then the `initialized`
  // notification, then the real call — carrying the Mcp-Session-Id the server
  // issued (if any). Done per call rather than cached so it stays correct
  // across restarts and load-balanced instances, at the cost of two extra
  // round trips.
  private async send(
    serverUrl: string,
    accessToken: string,
    method: string,
    params?: Record<string, unknown>,
  ): Promise<Response> {
    const fetchFn = this.secureHttpClientService.createSsrfSafeFetch();

    const initializeResponse = await fetchFn(serverUrl, {
      method: 'POST',
      headers: this.buildHeaders(accessToken, null),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: 'LeapCRM', version: '1.0.0' },
        },
      }),
    });

    if (!initializeResponse.ok) {
      return initializeResponse;
    }

    const session: SessionContext = {
      sessionId: initializeResponse.headers.get('mcp-session-id'),
    };

    await initializeResponse.text();

    const notificationResponse = await fetchFn(serverUrl, {
      method: 'POST',
      headers: this.buildHeaders(accessToken, session),
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      }),
    });

    await notificationResponse.text();

    return fetchFn(serverUrl, {
      method: 'POST',
      headers: this.buildHeaders(accessToken, session),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: MCP_REQUEST_ID,
        method,
        ...(isDefined(params) && { params }),
      }),
    });
  }

  private buildHeaders(
    accessToken: string,
    session: SessionContext | null,
  ): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      // The transport requires clients to accept both response formats.
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${accessToken}`,
      ...(isDefined(session) && {
        'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
      }),
      ...(isDefined(session?.sessionId) && {
        'Mcp-Session-Id': session.sessionId,
      }),
    };
  }

  private async readJsonRpcResponse<TResult>(
    response: Response,
    serverUrl: string,
    method: string,
  ): Promise<JsonRpcResponse<TResult>> {
    const contentType = response.headers.get('content-type') ?? '';
    const text = await response.text();

    try {
      if (!contentType.includes('text/event-stream')) {
        return JSON.parse(text) as JsonRpcResponse<TResult>;
      }

      const messages = text
        .split(/\r?\n\r?\n/)
        .map((event) =>
          event
            .split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice('data:'.length).trimStart())
            .join('\n'),
        )
        .filter((data) => data !== '')
        .map((data) => JSON.parse(data) as JsonRpcResponse<TResult>);

      const matching = messages.find(
        (message) => message.id === MCP_REQUEST_ID,
      );

      if (isDefined(matching)) {
        return matching;
      }
    } catch {
      // falls through to the shared error below
    }

    throw new McpConnectionException(
      `MCP server ${serverUrl} returned a response for ${method} that could not be parsed: ${text.slice(0, 300)}`,
      McpConnectionExceptionCode.MCP_REQUEST_FAILED,
    );
  }
}
