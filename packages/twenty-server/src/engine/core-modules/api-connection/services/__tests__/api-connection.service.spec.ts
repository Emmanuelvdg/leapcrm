import { type ApiConnectionEntity } from 'src/engine/core-modules/api-connection/entities/api-connection.entity';
import { ApiConnectionAuthType } from 'src/engine/core-modules/api-connection/enums/api-connection-auth-type.enum';
import { ApiConnectionStatus } from 'src/engine/core-modules/api-connection/enums/api-connection-status.enum';
import { ApiConnectionService } from 'src/engine/core-modules/api-connection/services/api-connection.service';
import { toApiConnectionDTO } from 'src/engine/core-modules/api-connection/utils/to-api-connection-dto.util';
import { type SecretEncryptionService } from 'src/engine/core-modules/secret-encryption/secret-encryption.service';
import { type WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';

const PLACEHOLDER_KEY = 'glb_live_PLACEHOLDER_KEY';
const WORKSPACE_ID = '20202020-0000-4000-8000-000000000001';

const countOperation = {
  name: 'search_contacts_count',
  description: 'Count contacts',
  method: 'POST',
  path: '/contacts/search/count',
  parameters: [],
  requestBodySchema: { type: 'object', properties: {} },
  isEnabled: true,
};

const storedConnection = {
  id: 'connection-1',
  workspaceId: WORKSPACE_ID,
  name: 'GetLeads',
  baseUrl: 'https://app.getleads.io/api/v1',
  authType: ApiConnectionAuthType.BEARER,
  authHeaderName: null,
  secret: 'enc:v2:existing',
  defaultHeaders: {},
  operations: [countOperation],
  testOperationName: 'search_contacts_count',
  testArguments: { company_size_min: 1 },
  openApiSpecUrl: null,
  status: ApiConnectionStatus.CONNECTED,
  lastErrorMessage: null,
  lastTestedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as ApiConnectionEntity;

describe('ApiConnectionService', () => {
  let repository: jest.Mocked<
    Pick<
      WorkspaceScopedRepository<ApiConnectionEntity>,
      'find' | 'findOne' | 'insertAndReturnOne' | 'update' | 'delete'
    >
  >;
  let secretEncryptionService: jest.Mocked<
    Pick<
      SecretEncryptionService,
      'encryptVersioned' | 'decryptVersionedOrThrow'
    >
  >;
  let service: ApiConnectionService;

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn().mockResolvedValue(storedConnection),
      insertAndReturnOne: jest
        .fn()
        .mockImplementation(async (_workspaceId, values) => ({
          ...storedConnection,
          ...values,
        })),
      update: jest.fn(),
      delete: jest.fn(),
    };
    secretEncryptionService = {
      encryptVersioned: jest
        .fn()
        .mockImplementation((value: string) => `enc:v2:${value.length}`),
      decryptVersionedOrThrow: jest.fn().mockReturnValue(PLACEHOLDER_KEY),
    };

    service = new ApiConnectionService(
      repository as unknown as WorkspaceScopedRepository<ApiConnectionEntity>,
      secretEncryptionService as unknown as SecretEncryptionService,
    );
  });

  it('encrypts the key with the workspace as context on create', async () => {
    await service.create({
      workspaceId: WORKSPACE_ID,
      name: ' GetLeads ',
      baseUrl: 'https://app.getleads.io/api/v1/',
      authType: ApiConnectionAuthType.BEARER,
      secret: ` ${PLACEHOLDER_KEY} `,
      operations: [countOperation],
      testOperationName: 'search_contacts_count',
    });

    expect(secretEncryptionService.encryptVersioned).toHaveBeenCalledWith(
      PLACEHOLDER_KEY,
      { workspaceId: WORKSPACE_ID },
    );

    const [workspaceId, values] = repository.insertAndReturnOne.mock.calls[0];

    expect(workspaceId).toBe(WORKSPACE_ID);
    expect(values).toMatchObject({
      name: 'GetLeads',
      baseUrl: 'https://app.getleads.io/api/v1',
      secret: `enc:v2:${PLACEHOLDER_KEY.length}`,
      status: ApiConnectionStatus.PENDING,
    });
    expect(JSON.stringify(values)).not.toContain(PLACEHOLDER_KEY);
  });

  it('requires a key unless auth is NONE', async () => {
    await expect(
      service.create({
        workspaceId: WORKSPACE_ID,
        name: 'GetLeads',
        baseUrl: 'https://app.getleads.io/api/v1',
        authType: ApiConnectionAuthType.BEARER,
      }),
    ).rejects.toThrow(/API key is required/);

    await service.create({
      workspaceId: WORKSPACE_ID,
      name: 'Public API',
      baseUrl: 'https://api.example.com',
      authType: ApiConnectionAuthType.NONE,
      secret: 'ignored',
    });

    expect(repository.insertAndReturnOne.mock.calls[0][1]).toMatchObject({
      secret: null,
    });
  });

  it('keeps the stored key when an update does not send one', async () => {
    const { needsRetest } = await service.update('connection-1', WORKSPACE_ID, {
      name: 'GetLeads renamed',
    });

    expect(needsRetest).toBe(false);
    expect(secretEncryptionService.encryptVersioned).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(
      WORKSPACE_ID,
      { id: 'connection-1' },
      expect.objectContaining({
        name: 'GetLeads renamed',
        secret: 'enc:v2:existing',
      }),
    );
  });

  it('does not retest when the form resends unchanged settings', async () => {
    const { needsRetest } = await service.update('connection-1', WORKSPACE_ID, {
      name: 'GetLeads',
      baseUrl: 'https://app.getleads.io/api/v1',
      authType: ApiConnectionAuthType.BEARER,
      authHeaderName: null,
      defaultHeaders: {},
      testOperationName: 'search_contacts_count',
      testArguments: { company_size_min: 1 },
    });

    expect(needsRetest).toBe(false);
  });

  it('asks for a retest when the base URL changes', async () => {
    const { needsRetest } = await service.update('connection-1', WORKSPACE_ID, {
      baseUrl: 'https://app.getleads.io/api/v2',
    });

    expect(needsRetest).toBe(true);
  });

  it('replaces the key and asks for a retest when a new one is sent', async () => {
    const { needsRetest } = await service.update('connection-1', WORKSPACE_ID, {
      secret: 'glb_live_NEW_PLACEHOLDER',
    });

    expect(needsRetest).toBe(true);
    expect(repository.update).toHaveBeenCalledWith(
      WORKSPACE_ID,
      { id: 'connection-1' },
      expect.objectContaining({
        secret: 'enc:v2:24',
        status: ApiConnectionStatus.PENDING,
      }),
    );
  });

  it('looks connections up within the caller workspace only', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.findByIdOrThrow('connection-1', 'other-workspace'),
    ).rejects.toThrow(/not found in this workspace/);
    expect(repository.findOne).toHaveBeenCalledWith('other-workspace', {
      where: { id: 'connection-1' },
    });
  });

  it('decrypts the key with the connection workspace', () => {
    expect(service.getDecryptedSecret(storedConnection)).toBe(PLACEHOLDER_KEY);
    expect(
      secretEncryptionService.decryptVersionedOrThrow,
    ).toHaveBeenCalledWith('enc:v2:existing', { workspaceId: WORKSPACE_ID });
  });
});

describe('toApiConnectionDTO', () => {
  it('drops the encrypted key and reports whether one is stored', () => {
    const dto = toApiConnectionDTO(storedConnection);

    expect(dto).not.toHaveProperty('secret');
    expect(dto.hasSecret).toBe(true);
  });
});
