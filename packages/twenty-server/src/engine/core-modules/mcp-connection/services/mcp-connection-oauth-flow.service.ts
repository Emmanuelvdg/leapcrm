import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { exchangeCodeForToken } from 'src/engine/core-modules/application/connection-provider/utils/exchange-code-for-token.util';
import { computePkceChallenge } from 'src/engine/core-modules/application/connection-provider/utils/compute-pkce-challenge.util';
import { generatePkceVerifier } from 'src/engine/core-modules/application/connection-provider/utils/generate-pkce-verifier.util';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { JwtWrapperService } from 'src/engine/core-modules/jwt/services/jwt-wrapper.service';
import { McpServerConnectionAuthMethod } from 'src/engine/core-modules/mcp-connection/enums/mcp-server-connection-auth-method.enum';
import { McpConnectionExceptionCode } from 'src/engine/core-modules/mcp-connection/mcp-connection-exception-code.enum';
import { McpConnectionException } from 'src/engine/core-modules/mcp-connection/mcp-connection.exception';
import { McpConnectionService } from 'src/engine/core-modules/mcp-connection/services/mcp-connection.service';
import { McpDynamicClientRegistrationService } from 'src/engine/core-modules/mcp-connection/services/mcp-dynamic-client-registration.service';
import { McpOAuthDiscoveryService } from 'src/engine/core-modules/mcp-connection/services/mcp-oauth-discovery.service';
import { type McpConnectionOAuthStateJwtPayload } from 'src/engine/core-modules/mcp-connection/types/mcp-connection-oauth-state-jwt-payload.type';
import { buildMcpConnectionOAuthCallbackUrl } from 'src/engine/core-modules/mcp-connection/utils/build-mcp-connection-oauth-callback-url.util';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

const STATE_JWT_EXPIRES_IN = '10m';

type CallbackResult = {
  connectionId: string;
  workspaceId: string;
};

@Injectable()
export class McpConnectionOAuthFlowService {
  private readonly logger = new Logger(McpConnectionOAuthFlowService.name);

  constructor(
    private readonly mcpConnectionService: McpConnectionService,
    private readonly mcpOAuthDiscoveryService: McpOAuthDiscoveryService,
    private readonly mcpDynamicClientRegistrationService: McpDynamicClientRegistrationService,
    private readonly jwtWrapperService: JwtWrapperService,
    private readonly secureHttpClientService: SecureHttpClientService,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  async startAuthorizationFlow(args: {
    connectionId: string;
    workspaceId: string;
    userId: string;
  }): Promise<{ authorizationUrl: string }> {
    const connection = await this.mcpConnectionService.findByIdOrThrow(
      args.connectionId,
      args.workspaceId,
    );

    if (connection.authMethod !== McpServerConnectionAuthMethod.OAUTH) {
      throw new McpConnectionException(
        `MCP server connection ${connection.id} authenticates with an API key, not OAuth`,
        McpConnectionExceptionCode.INVALID_REQUEST,
      );
    }

    const callbackUrl = buildMcpConnectionOAuthCallbackUrl(this.getServerUrl());
    let requestedScope: string | null = null;

    if (!connection.usesManualOverrides) {
      const discovered = await this.mcpOAuthDiscoveryService.discover(
        connection.serverUrl,
      );

      await this.mcpConnectionService.persistDiscoveredEndpoints(
        connection.id,
        discovered,
      );
      connection.authorizationEndpoint = discovered.authorizationEndpoint;
      connection.tokenEndpoint = discovered.tokenEndpoint;
      connection.registrationEndpoint = discovered.registrationEndpoint;
      requestedScope = discovered.scopesSupported?.join(' ') ?? null;

      if (!isDefined(connection.clientId)) {
        if (!isDefined(discovered.registrationEndpoint)) {
          throw new McpConnectionException(
            `${connection.serverUrl}'s authorization server does not support dynamic client registration (RFC 7591) — supply a client ID manually instead.`,
            McpConnectionExceptionCode.CLIENT_CREDENTIALS_NOT_CONFIGURED,
          );
        }

        const registration =
          await this.mcpDynamicClientRegistrationService.register({
            registrationEndpoint: discovered.registrationEndpoint,
            redirectUri: callbackUrl,
            clientName: `LeapCRM: ${connection.name}`,
          });

        await this.mcpConnectionService.persistDynamicClientRegistration(
          connection.id,
          connection.workspaceId,
          registration,
        );
        connection.clientId = registration.clientId;
      }
    }

    if (
      !isDefined(connection.authorizationEndpoint) ||
      !isDefined(connection.clientId)
    ) {
      throw new McpConnectionException(
        `MCP server connection ${connection.id} is missing authorizationEndpoint or clientId after discovery/registration`,
        McpConnectionExceptionCode.CLIENT_CREDENTIALS_NOT_CONFIGURED,
      );
    }

    const codeVerifier = generatePkceVerifier();

    const state = await this.signState({
      sub: connection.id,
      type: JwtTokenTypeEnum.MCP_CONNECTION_OAUTH_STATE,
      connectionId: connection.id,
      workspaceId: args.workspaceId,
      userId: args.userId,
      codeVerifier,
    });

    const authorizationUrl = new URL(connection.authorizationEndpoint);

    authorizationUrl.searchParams.set('client_id', connection.clientId);
    authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
    authorizationUrl.searchParams.set('response_type', 'code');
    if (isDefined(requestedScope) && requestedScope !== '') {
      authorizationUrl.searchParams.set('scope', requestedScope);
    }

    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set(
      'code_challenge',
      computePkceChallenge(codeVerifier),
    );
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    return { authorizationUrl: authorizationUrl.toString() };
  }

  async completeAuthorizationFlow(args: {
    code: string;
    state: string;
  }): Promise<CallbackResult> {
    const statePayload = await this.verifyState(args.state);

    const connection = await this.mcpConnectionService.findByIdOrThrowUnscoped(
      statePayload.connectionId,
    );

    if (connection.workspaceId !== statePayload.workspaceId) {
      throw new McpConnectionException(
        'OAuth state does not match the connection it was issued for',
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
      const tokenResponse = await exchangeCodeForToken({
        fetchFn: this.secureHttpClientService.createSsrfSafeFetch(),
        tokenEndpoint: connection.tokenEndpoint,
        clientId: connection.clientId,
        clientSecret,
        code: args.code,
        redirectUri: buildMcpConnectionOAuthCallbackUrl(this.getServerUrl()),
        codeVerifier: statePayload.codeVerifier,
        contentType: 'form-urlencoded',
      });

      await this.mcpConnectionService.persistTokens(
        connection.id,
        connection.workspaceId,
        {
          accessToken: tokenResponse.accessToken,
          refreshToken: tokenResponse.refreshToken,
          // exchangeCodeForToken's response type doesn't carry expires_in —
          // treated as non-expiring until the server rejects the token,
          // at which point a 401 from the MCP client triggers a refresh
          // attempt (see McpClientService).
          expiresInSeconds: null,
          scopes: tokenResponse.scopes,
        },
      );
    } catch (error) {
      await this.mcpConnectionService.markError(
        connection.id,
        error instanceof Error ? error.message : String(error),
      );

      this.logger.error(
        `MCP connection token exchange failed for connection ${connection.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      throw new McpConnectionException(
        error instanceof Error ? error.message : String(error),
        McpConnectionExceptionCode.TOKEN_EXCHANGE_FAILED,
      );
    }

    return { connectionId: connection.id, workspaceId: connection.workspaceId };
  }

  private async signState(
    payload: McpConnectionOAuthStateJwtPayload,
  ): Promise<string> {
    return this.jwtWrapperService.signAsyncOrThrow(payload, {
      expiresIn: STATE_JWT_EXPIRES_IN,
    });
  }

  private async verifyState(
    state: string,
  ): Promise<McpConnectionOAuthStateJwtPayload> {
    try {
      const verified = (await this.jwtWrapperService.verifyJwtToken(
        state,
      )) as McpConnectionOAuthStateJwtPayload;

      if (verified.type !== JwtTokenTypeEnum.MCP_CONNECTION_OAUTH_STATE) {
        throw new Error('Wrong JWT type for MCP connection OAuth state');
      }

      return verified;
    } catch (error) {
      this.logger.warn(
        `Rejected MCP connection OAuth state: ${
          error instanceof Error ? error.message : 'unknown reason'
        }`,
      );

      throw new McpConnectionException(
        'OAuth state signature invalid or expired',
        McpConnectionExceptionCode.INVALID_STATE,
      );
    }
  }

  private getServerUrl(): string {
    return this.twentyConfigService.get('SERVER_URL');
  }
}
