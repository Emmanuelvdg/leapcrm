import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { McpConnectionExceptionCode } from 'src/engine/core-modules/mcp-connection/mcp-connection-exception-code.enum';
import { McpConnectionException } from 'src/engine/core-modules/mcp-connection/mcp-connection.exception';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';

type DynamicClientRegistrationResult = {
  clientId: string;
  clientSecret: string | null;
};

type RegistrationResponseBody = {
  client_id?: string;
  client_secret?: string;
};

@Injectable()
export class McpDynamicClientRegistrationService {
  constructor(
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {}

  // RFC 7591 — registers this app as an OAuth client with the MCP server's
  // authorization server. Public clients (no client_secret in the response)
  // are supported; PKCE covers the confidentiality gap in that case.
  async register(args: {
    registrationEndpoint: string;
    redirectUri: string;
    clientName: string;
  }): Promise<DynamicClientRegistrationResult> {
    const fetchFn = this.secureHttpClientService.createSsrfSafeFetch();

    let response: Response;

    try {
      response = await fetchFn(args.registrationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          redirect_uris: [args.redirectUri],
          client_name: args.clientName,
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          token_endpoint_auth_method: 'client_secret_post',
        }),
      });
    } catch (error) {
      throw new McpConnectionException(
        `Dynamic client registration request to ${args.registrationEndpoint} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        McpConnectionExceptionCode.DYNAMIC_CLIENT_REGISTRATION_FAILED,
      );
    }

    if (!response.ok) {
      const text = await response.text();

      throw new McpConnectionException(
        `Dynamic client registration responded with ${response.status}: ${text.slice(0, 500)}`,
        McpConnectionExceptionCode.DYNAMIC_CLIENT_REGISTRATION_FAILED,
      );
    }

    const body = (await response.json()) as RegistrationResponseBody;

    if (!isDefined(body.client_id)) {
      throw new McpConnectionException(
        `Dynamic client registration response from ${args.registrationEndpoint} did not include a client_id`,
        McpConnectionExceptionCode.DYNAMIC_CLIENT_REGISTRATION_FAILED,
      );
    }

    return {
      clientId: body.client_id,
      clientSecret: body.client_secret ?? null,
    };
  }
}
