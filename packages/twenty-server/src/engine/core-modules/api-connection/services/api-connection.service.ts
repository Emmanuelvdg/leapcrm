import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { type QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { ApiConnectionExceptionCode } from 'src/engine/core-modules/api-connection/api-connection-exception-code.enum';
import { ApiConnectionException } from 'src/engine/core-modules/api-connection/api-connection.exception';
import { ApiConnectionEntity } from 'src/engine/core-modules/api-connection/entities/api-connection.entity';
import { ApiConnectionAuthType } from 'src/engine/core-modules/api-connection/enums/api-connection-auth-type.enum';
import { ApiConnectionStatus } from 'src/engine/core-modules/api-connection/enums/api-connection-status.enum';
import { validateApiConnectionConfiguration } from 'src/engine/core-modules/api-connection/utils/validate-api-connection-configuration.util';
import { type EncryptedString } from 'src/engine/core-modules/secret-encryption/branded-strings/encrypted-string.type';
import { type PlaintextString } from 'src/engine/core-modules/secret-encryption/branded-strings/plaintext-string.type';
import { SecretEncryptionService } from 'src/engine/core-modules/secret-encryption/secret-encryption.service';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';

export type ApiConnectionEditableFields = {
  name: string;
  baseUrl: string;
  authType: ApiConnectionAuthType;
  authHeaderName: string | null;
  defaultHeaders: Record<string, string>;
  operations: unknown;
  testOperationName: string | null;
  testArguments: Record<string, unknown> | null;
  openApiSpecUrl: string | null;
};

export type CreateApiConnectionArgs = Partial<ApiConnectionEditableFields> &
  Pick<ApiConnectionEditableFields, 'name' | 'baseUrl' | 'authType'> & {
    workspaceId: string;
    secret?: string | null;
  };

export type UpdateApiConnectionArgs = Partial<ApiConnectionEditableFields> & {
  secret?: string | null;
};

const CONNECTIVITY_FIELDS = [
  'baseUrl',
  'authType',
  'authHeaderName',
  'defaultHeaders',
  'testOperationName',
  'testArguments',
] as const satisfies (keyof ApiConnectionEditableFields)[];

const normalizeBaseUrl = (baseUrl: string): string =>
  baseUrl.trim().replace(/\/+$/, '');

@Injectable()
export class ApiConnectionService {
  constructor(
    @InjectWorkspaceScopedRepository(ApiConnectionEntity)
    private readonly repository: WorkspaceScopedRepository<ApiConnectionEntity>,
    private readonly secretEncryptionService: SecretEncryptionService,
  ) {}

  async findAllByWorkspace(
    workspaceId: string,
  ): Promise<ApiConnectionEntity[]> {
    return this.repository.find(workspaceId, { order: { createdAt: 'ASC' } });
  }

  async findByIdOrThrow(
    id: string,
    workspaceId: string,
  ): Promise<ApiConnectionEntity> {
    const connection = await this.repository.findOne(workspaceId, {
      where: { id },
    });

    if (!isDefined(connection)) {
      throw new ApiConnectionException(
        `API connection ${id} not found in this workspace`,
        ApiConnectionExceptionCode.CONNECTION_NOT_FOUND,
      );
    }

    return connection;
  }

  async create(args: CreateApiConnectionArgs): Promise<ApiConnectionEntity> {
    const fields: ApiConnectionEditableFields = {
      name: args.name.trim(),
      baseUrl: normalizeBaseUrl(args.baseUrl),
      authType: args.authType,
      authHeaderName: args.authHeaderName ?? null,
      defaultHeaders: args.defaultHeaders ?? {},
      operations: args.operations ?? [],
      testOperationName: args.testOperationName ?? null,
      testArguments: args.testArguments ?? null,
      openApiSpecUrl: args.openApiSpecUrl ?? null,
    };

    const hasSecret = isDefined(args.secret) && args.secret !== '';

    this.assertSecretMatchesAuthType(fields.authType, hasSecret);

    const operations = validateApiConnectionConfiguration(fields);

    // The jsonb columns hold arbitrary JSON, which TypeORM's deep-partial
    // type cannot express for unknown values.
    return this.repository.insertAndReturnOne(args.workspaceId, {
      ...fields,
      authHeaderName:
        fields.authType === ApiConnectionAuthType.API_KEY_HEADER
          ? fields.authHeaderName
          : null,
      operations,
      secret:
        hasSecret && fields.authType !== ApiConnectionAuthType.NONE
          ? this.encryptSecret(args.secret as string, args.workspaceId)
          : null,
      status: ApiConnectionStatus.PENDING,
    } as QueryDeepPartialEntity<ApiConnectionEntity>);
  }

  async update(
    id: string,
    workspaceId: string,
    updates: UpdateApiConnectionArgs,
  ): Promise<{ connection: ApiConnectionEntity; needsRetest: boolean }> {
    const existing = await this.findByIdOrThrow(id, workspaceId);

    const fields: ApiConnectionEditableFields = {
      name: updates.name?.trim() ?? existing.name,
      baseUrl: isDefined(updates.baseUrl)
        ? normalizeBaseUrl(updates.baseUrl)
        : existing.baseUrl,
      authType: updates.authType ?? existing.authType,
      authHeaderName:
        updates.authHeaderName !== undefined
          ? updates.authHeaderName
          : existing.authHeaderName,
      defaultHeaders: updates.defaultHeaders ?? existing.defaultHeaders,
      operations: updates.operations ?? existing.operations,
      testOperationName:
        updates.testOperationName !== undefined
          ? updates.testOperationName
          : existing.testOperationName,
      testArguments:
        updates.testArguments !== undefined
          ? updates.testArguments
          : existing.testArguments,
      openApiSpecUrl:
        updates.openApiSpecUrl !== undefined
          ? updates.openApiSpecUrl
          : existing.openApiSpecUrl,
    };

    const isReplacingSecret =
      isDefined(updates.secret) && updates.secret !== '';
    const isUsingNoAuth = fields.authType === ApiConnectionAuthType.NONE;

    this.assertSecretMatchesAuthType(
      fields.authType,
      isReplacingSecret || isDefined(existing.secret),
    );

    const operations = validateApiConnectionConfiguration(fields);

    let secret: EncryptedString | null = existing.secret;

    if (isUsingNoAuth) {
      secret = null;
    } else if (isReplacingSecret) {
      secret = this.encryptSecret(updates.secret as string, workspaceId);
    }

    // The settings form sends every field on save, so compare values rather
    // than presence to avoid a paid test call on a rename.
    const needsRetest =
      isReplacingSecret ||
      CONNECTIVITY_FIELDS.some(
        (field) =>
          JSON.stringify(fields[field] ?? null) !==
          JSON.stringify(existing[field] ?? null),
      );

    await this.repository.update(workspaceId, { id }, {
      ...fields,
      authHeaderName:
        fields.authType === ApiConnectionAuthType.API_KEY_HEADER
          ? fields.authHeaderName
          : null,
      operations,
      secret,
      ...(needsRetest && {
        status: ApiConnectionStatus.PENDING,
        lastErrorMessage: null,
      }),
    } as QueryDeepPartialEntity<ApiConnectionEntity>);

    return {
      connection: await this.findByIdOrThrow(id, workspaceId),
      needsRetest,
    };
  }

  async delete(id: string, workspaceId: string): Promise<ApiConnectionEntity> {
    const connection = await this.findByIdOrThrow(id, workspaceId);

    await this.repository.delete(workspaceId, { id });

    return connection;
  }

  async recordTestResult(
    connection: ApiConnectionEntity,
    result: { success: boolean; errorMessage: string | null },
  ): Promise<ApiConnectionEntity> {
    await this.repository.update(
      connection.workspaceId,
      { id: connection.id },
      {
        status: result.success
          ? ApiConnectionStatus.CONNECTED
          : ApiConnectionStatus.ERROR,
        lastErrorMessage: result.success ? null : result.errorMessage,
        lastTestedAt: new Date(),
      },
    );

    return this.findByIdOrThrow(connection.id, connection.workspaceId);
  }

  async markError(
    connection: ApiConnectionEntity,
    message: string,
  ): Promise<void> {
    await this.repository.update(
      connection.workspaceId,
      { id: connection.id },
      { status: ApiConnectionStatus.ERROR, lastErrorMessage: message },
    );
  }

  getDecryptedSecret(connection: ApiConnectionEntity): string | null {
    if (!isDefined(connection.secret)) {
      return null;
    }

    return this.secretEncryptionService.decryptVersionedOrThrow(
      connection.secret,
      { workspaceId: connection.workspaceId },
    );
  }

  private encryptSecret(secret: string, workspaceId: string): EncryptedString {
    return this.secretEncryptionService.encryptVersioned(
      secret.trim() as PlaintextString,
      { workspaceId },
    );
  }

  private assertSecretMatchesAuthType(
    authType: ApiConnectionAuthType,
    hasSecret: boolean,
  ): void {
    if (authType !== ApiConnectionAuthType.NONE && !hasSecret) {
      throw new ApiConnectionException(
        'An API key is required for this authentication type',
        ApiConnectionExceptionCode.INVALID_CONFIGURATION,
      );
    }
  }
}
