import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { isDefined } from 'twenty-shared/utils';
import { Repository } from 'typeorm';

import { McpServerConnectionEntity } from 'src/engine/core-modules/mcp-connection/entities/mcp-server-connection.entity';
import { McpServerConnectionAuthMethod } from 'src/engine/core-modules/mcp-connection/enums/mcp-server-connection-auth-method.enum';
import { McpServerConnectionStatus } from 'src/engine/core-modules/mcp-connection/enums/mcp-server-connection-status.enum';
import { McpConnectionExceptionCode } from 'src/engine/core-modules/mcp-connection/mcp-connection-exception-code.enum';
import { McpConnectionException } from 'src/engine/core-modules/mcp-connection/mcp-connection.exception';
import { type PlaintextString } from 'src/engine/core-modules/secret-encryption/branded-strings/plaintext-string.type';
import { SecretEncryptionService } from 'src/engine/core-modules/secret-encryption/secret-encryption.service';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';

export type CreateMcpServerConnectionArgs = {
  workspaceId: string;
  name: string;
  serverUrl: string;
  // When provided, the connection authenticates with this static key sent as
  // a Bearer token — no OAuth flow. Mutually exclusive with manualOverrides.
  apiKey?: string;
  // When provided, discovery and dynamic client registration are both
  // skipped for this connection — some MCP servers don't implement the
  // auth spec's discovery, or require a pre-registered client instead of
  // RFC 7591 registration.
  manualOverrides?: {
    authorizationEndpoint: string;
    tokenEndpoint: string;
    clientId: string;
    clientSecret?: string;
  };
};

@Injectable()
export class McpConnectionService {
  constructor(
    @InjectWorkspaceScopedRepository(McpServerConnectionEntity)
    private readonly repository: WorkspaceScopedRepository<McpServerConnectionEntity>,
    // The OAuth callback resolves a connection from the signed state JWT
    // alone (no workspace context on the request), so it needs an unscoped
    // lookup by id — see findByIdOrThrowUnscoped.
    // eslint-disable-next-line twenty/prefer-workspace-scoped-repository
    @InjectRepository(McpServerConnectionEntity)
    private readonly unscopedRepository: Repository<McpServerConnectionEntity>,
    private readonly secretEncryptionService: SecretEncryptionService,
  ) {}

  async findAllByWorkspace(
    workspaceId: string,
  ): Promise<McpServerConnectionEntity[]> {
    return this.repository.find(workspaceId, { order: { createdAt: 'ASC' } });
  }

  async findByIdOrThrow(
    id: string,
    workspaceId: string,
  ): Promise<McpServerConnectionEntity> {
    const connection = await this.repository.findOne(workspaceId, {
      where: { id },
    });

    if (!isDefined(connection)) {
      throw new McpConnectionException(
        `MCP server connection ${id} not found in this workspace`,
        McpConnectionExceptionCode.CONNECTION_NOT_FOUND,
      );
    }

    return connection;
  }

  // Unscoped by workspace — used only by the OAuth callback, where the
  // connection id comes from the signed state JWT (already workspace-bound
  // when it was issued), not from user-supplied input.
  async findByIdOrThrowUnscoped(
    id: string,
  ): Promise<McpServerConnectionEntity> {
    const connection = await this.unscopedRepository.findOneBy({ id });

    if (!isDefined(connection)) {
      throw new McpConnectionException(
        `MCP server connection ${id} not found`,
        McpConnectionExceptionCode.CONNECTION_NOT_FOUND,
      );
    }

    return connection;
  }

  async create(
    args: CreateMcpServerConnectionArgs,
  ): Promise<McpServerConnectionEntity> {
    const { manualOverrides, apiKey } = args;

    if (isDefined(apiKey) && isDefined(manualOverrides)) {
      throw new McpConnectionException(
        'An API key connection cannot also use manual OAuth endpoints',
        McpConnectionExceptionCode.INVALID_REQUEST,
      );
    }

    if (isDefined(apiKey)) {
      return this.repository.insertAndReturnOne(args.workspaceId, {
        name: args.name,
        serverUrl: args.serverUrl,
        authMethod: McpServerConnectionAuthMethod.API_KEY,
        status: McpServerConnectionStatus.CONNECTED,
        usesManualOverrides: false,
        accessToken: this.secretEncryptionService.encryptVersioned(
          apiKey as PlaintextString,
          { workspaceId: args.workspaceId },
        ),
      });
    }

    return this.repository.insertAndReturnOne(args.workspaceId, {
      name: args.name,
      serverUrl: args.serverUrl,
      authMethod: McpServerConnectionAuthMethod.OAUTH,
      status: McpServerConnectionStatus.PENDING,
      usesManualOverrides: isDefined(manualOverrides),
      authorizationEndpoint: manualOverrides?.authorizationEndpoint ?? null,
      tokenEndpoint: manualOverrides?.tokenEndpoint ?? null,
      clientId: manualOverrides?.clientId ?? null,
      clientSecret: isDefined(manualOverrides?.clientSecret)
        ? this.secretEncryptionService.encryptVersioned(
            manualOverrides.clientSecret as PlaintextString,
            { workspaceId: args.workspaceId },
          )
        : null,
    });
  }

  async update(
    id: string,
    workspaceId: string,
    updates: { name?: string; serverUrl?: string },
  ): Promise<McpServerConnectionEntity> {
    await this.findByIdOrThrow(id, workspaceId);
    await this.repository.update(workspaceId, { id }, updates);

    return this.findByIdOrThrow(id, workspaceId);
  }

  async replaceApiKey(
    id: string,
    workspaceId: string,
    apiKey: string,
  ): Promise<McpServerConnectionEntity> {
    const connection = await this.findByIdOrThrow(id, workspaceId);

    if (connection.authMethod !== McpServerConnectionAuthMethod.API_KEY) {
      throw new McpConnectionException(
        `MCP server connection ${id} does not use an API key`,
        McpConnectionExceptionCode.INVALID_REQUEST,
      );
    }

    await this.repository.update(
      workspaceId,
      { id },
      {
        accessToken: this.secretEncryptionService.encryptVersioned(
          apiKey as PlaintextString,
          { workspaceId },
        ),
        status: McpServerConnectionStatus.CONNECTED,
        lastErrorMessage: null,
      },
    );

    return this.findByIdOrThrow(id, workspaceId);
  }

  async delete(
    id: string,
    workspaceId: string,
  ): Promise<McpServerConnectionEntity> {
    const connection = await this.findByIdOrThrow(id, workspaceId);

    await this.repository.delete(workspaceId, { id });

    return connection;
  }

  // Discovery/DCR/token persistence below are only ever reached by the
  // OAuth flow, which already resolved and workspace-checked the connection
  // (see McpConnectionOAuthFlowService) — updating by bare id here is safe.
  async persistDiscoveredEndpoints(
    id: string,
    endpoints: {
      authorizationEndpoint: string;
      tokenEndpoint: string;
      registrationEndpoint: string | null;
    },
  ): Promise<void> {
    await this.unscopedRepository.update(
      { id },
      {
        authorizationEndpoint: endpoints.authorizationEndpoint,
        tokenEndpoint: endpoints.tokenEndpoint,
        registrationEndpoint: endpoints.registrationEndpoint,
      },
    );
  }

  async persistDynamicClientRegistration(
    id: string,
    workspaceId: string,
    registration: { clientId: string; clientSecret: string | null },
  ): Promise<void> {
    await this.unscopedRepository.update(
      { id },
      {
        clientId: registration.clientId,
        clientSecret: isDefined(registration.clientSecret)
          ? this.secretEncryptionService.encryptVersioned(
              registration.clientSecret as PlaintextString,
              { workspaceId },
            )
          : null,
      },
    );
  }

  async persistTokens(
    id: string,
    workspaceId: string,
    tokens: {
      accessToken: string;
      refreshToken: string | null;
      expiresInSeconds: number | null;
      scopes: string[] | null;
    },
  ): Promise<void> {
    await this.unscopedRepository.update(
      { id },
      {
        status: McpServerConnectionStatus.CONNECTED,
        lastErrorMessage: null,
        accessToken: this.secretEncryptionService.encryptVersioned(
          tokens.accessToken as PlaintextString,
          { workspaceId },
        ),
        refreshToken: isDefined(tokens.refreshToken)
          ? this.secretEncryptionService.encryptVersioned(
              tokens.refreshToken as PlaintextString,
              { workspaceId },
            )
          : null,
        tokenExpiresAt: isDefined(tokens.expiresInSeconds)
          ? new Date(Date.now() + tokens.expiresInSeconds * 1000)
          : null,
        scopes: tokens.scopes?.join(' ') ?? null,
      },
    );
  }

  async markError(id: string, message: string): Promise<void> {
    await this.unscopedRepository.update(
      { id },
      { status: McpServerConnectionStatus.ERROR, lastErrorMessage: message },
    );
  }

  getDecryptedClientSecret(
    connection: McpServerConnectionEntity,
  ): string | null {
    if (!isDefined(connection.clientSecret)) {
      return null;
    }

    return this.secretEncryptionService.decryptVersionedOrThrow(
      connection.clientSecret,
      { workspaceId: connection.workspaceId },
    );
  }

  getDecryptedAccessToken(connection: McpServerConnectionEntity): string {
    if (!isDefined(connection.accessToken)) {
      throw new McpConnectionException(
        `MCP server connection ${connection.id} has no access token — it must be (re)connected`,
        McpConnectionExceptionCode.FORBIDDEN,
      );
    }

    return this.secretEncryptionService.decryptVersionedOrThrow(
      connection.accessToken,
      { workspaceId: connection.workspaceId },
    );
  }

  getDecryptedRefreshToken(
    connection: McpServerConnectionEntity,
  ): string | null {
    if (!isDefined(connection.refreshToken)) {
      return null;
    }

    return this.secretEncryptionService.decryptVersionedOrThrow(
      connection.refreshToken,
      { workspaceId: connection.workspaceId },
    );
  }
}
