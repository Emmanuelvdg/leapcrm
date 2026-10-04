import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { McpConnectionExceptionCode } from 'src/engine/core-modules/mcp-connection/mcp-connection-exception-code.enum';
import { McpConnectionException } from 'src/engine/core-modules/mcp-connection/mcp-connection.exception';
import { type McpOAuthServerMetadata } from 'src/engine/core-modules/mcp-connection/types/mcp-oauth-server-metadata.type';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';

type ProtectedResourceMetadata = {
  authorization_servers?: string[];
  scopes_supported?: string[];
};

type AuthorizationServerMetadata = {
  authorization_endpoint?: string;
  token_endpoint?: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
};

@Injectable()
export class McpOAuthDiscoveryService {
  private readonly logger = new Logger(McpOAuthDiscoveryService.name);

  constructor(
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {}

  // Implements the MCP authorization spec's discovery chain:
  //   1. GET <server origin>/.well-known/oauth-protected-resource (RFC 9728)
  //      to find the associated authorization server(s).
  //   2. GET <authorization server>/.well-known/oauth-authorization-server
  //      (RFC 8414) on whichever server that resolves to.
  // Falls back to treating the MCP server's own origin as its authorization
  // server when step 1 isn't implemented (common for simpler servers) —
  // the spec permits this as the default when no protected-resource metadata
  // is published.
  async discover(serverUrl: string): Promise<McpOAuthServerMetadata> {
    const origin = new URL(serverUrl).origin;
    const fetchFn = this.secureHttpClientService.createSsrfSafeFetch();

    const { authorizationServerUrl, resourceScopesSupported } =
      await this.resolveAuthorizationServer(origin, fetchFn);

    const metadata = await this.fetchAuthorizationServerMetadata(
      authorizationServerUrl,
      fetchFn,
    );

    if (
      !isDefined(metadata.authorization_endpoint) ||
      !isDefined(metadata.token_endpoint)
    ) {
      throw new McpConnectionException(
        `Authorization server at ${authorizationServerUrl} did not publish authorization_endpoint/token_endpoint`,
        McpConnectionExceptionCode.DISCOVERY_FAILED,
      );
    }

    return {
      authorizationEndpoint: metadata.authorization_endpoint,
      tokenEndpoint: metadata.token_endpoint,
      registrationEndpoint: metadata.registration_endpoint ?? null,
      scopesSupported:
        resourceScopesSupported ?? metadata.scopes_supported ?? null,
    };
  }

  private async resolveAuthorizationServer(
    origin: string,
    fetchFn: typeof globalThis.fetch,
  ): Promise<{
    authorizationServerUrl: string;
    resourceScopesSupported: string[] | null;
  }> {
    try {
      const response = await fetchFn(
        `${origin}/.well-known/oauth-protected-resource`,
        { headers: { Accept: 'application/json' } },
      );

      if (response.ok) {
        const resourceMetadata =
          (await response.json()) as ProtectedResourceMetadata;
        const [firstAuthorizationServer] =
          resourceMetadata.authorization_servers ?? [];

        if (isDefined(firstAuthorizationServer)) {
          return {
            authorizationServerUrl: firstAuthorizationServer,
            resourceScopesSupported: resourceMetadata.scopes_supported ?? null,
          };
        }
      }
    } catch (error) {
      this.logger.warn(
        `Protected-resource metadata fetch failed for ${origin}, falling back to treating it as its own authorization server: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return { authorizationServerUrl: origin, resourceScopesSupported: null };
  }

  private async fetchAuthorizationServerMetadata(
    authorizationServerUrl: string,
    fetchFn: typeof globalThis.fetch,
  ): Promise<AuthorizationServerMetadata> {
    const url = `${authorizationServerUrl}/.well-known/oauth-authorization-server`;

    let response: Response;

    try {
      response = await fetchFn(url, {
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      throw new McpConnectionException(
        `Failed to fetch authorization server metadata from ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        McpConnectionExceptionCode.DISCOVERY_FAILED,
      );
    }

    if (!response.ok) {
      throw new McpConnectionException(
        `Authorization server metadata endpoint ${url} responded with ${response.status}`,
        McpConnectionExceptionCode.DISCOVERY_FAILED,
      );
    }

    return (await response.json()) as AuthorizationServerMetadata;
  }
}
