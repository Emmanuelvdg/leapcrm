import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { exchangeRefreshTokenForToken } from 'src/engine/core-modules/application/connection-provider/utils/exchange-refresh-token-for-token.util';
import { OAuthTokenEndpointError } from 'src/engine/core-modules/application/connection-provider/utils/post-oauth-token-request.util';
import { type McpServerConnectionEntity } from 'src/engine/core-modules/mcp-connection/entities/mcp-server-connection.entity';
import { McpConnectionExceptionCode } from 'src/engine/core-modules/mcp-connection/mcp-connection-exception-code.enum';
import { McpConnectionException } from 'src/engine/core-modules/mcp-connection/mcp-connection.exception';
import { McpConnectionService } from 'src/engine/core-modules/mcp-connection/services/mcp-connection.service';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';

@Injectable()
export class McpConnectionTokenRefreshService {
  private readonly logger = new Logger(McpConnectionTokenRefreshService.name);

  constructor(
    private readonly mcpConnectionService: McpConnectionService,
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {}

  // Returns a fresh plaintext access token, refreshing and persisting it
  // first if a refresh_token is on file. Throws if there's nothing to
  // refresh with — the caller (McpClientService) surfaces this as "must be
  // reconnected".
  async refreshAndPersist(
    connection: McpServerConnectionEntity,
  ): Promise<string> {
    const refreshToken =
      this.mcpConnectionService.getDecryptedRefreshToken(connection);

    if (!isDefined(refreshToken)) {
      throw new McpConnectionException(
        `MCP server connection ${connection.id} has no refresh token — it must be reconnected`,
        McpConnectionExceptionCode.FORBIDDEN,
      );
    }

    if (
      !isDefined(connection.tokenEndpoint) ||
      !isDefined(connection.clientId)
    ) {
      throw new McpConnectionException(
        `MCP server connection ${connection.id} is missing tokenEndpoint/clientId`,
        McpConnectionExceptionCode.CLIENT_CREDENTIALS_NOT_CONFIGURED,
      );
    }

    const clientSecret =
      this.mcpConnectionService.getDecryptedClientSecret(connection) ?? '';

    try {
      const tokenResponse = await exchangeRefreshTokenForToken({
        fetchFn: this.secureHttpClientService.createSsrfSafeFetch(),
        tokenEndpoint: connection.tokenEndpoint,
        clientId: connection.clientId,
        clientSecret,
        refreshToken,
        contentType: 'form-urlencoded',
      });

      await this.mcpConnectionService.persistTokens(
        connection.id,
        connection.workspaceId,
        {
          accessToken: tokenResponse.accessToken,
          // Some servers don't rotate the refresh token — keep the old one.
          refreshToken: tokenResponse.refreshToken ?? refreshToken,
          expiresInSeconds: null,
          scopes: tokenResponse.scopes,
        },
      );

      return tokenResponse.accessToken;
    } catch (error) {
      const isPermanent =
        error instanceof OAuthTokenEndpointError && error.status < 500;

      if (isPermanent) {
        await this.mcpConnectionService.markError(
          connection.id,
          `Refresh failed: ${error.message}`,
        );
      }

      this.logger.warn(
        `MCP connection token refresh failed for connection ${connection.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      throw new McpConnectionException(
        error instanceof Error ? error.message : String(error),
        McpConnectionExceptionCode.REFRESH_FAILED,
      );
    }
  }
}
