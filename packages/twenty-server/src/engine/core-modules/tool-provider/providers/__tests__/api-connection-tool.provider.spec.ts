import { ToolCategory } from 'twenty-shared/ai';

import { type ApiConnectionEntity } from 'src/engine/core-modules/api-connection/entities/api-connection.entity';
import { ApiConnectionAuthType } from 'src/engine/core-modules/api-connection/enums/api-connection-auth-type.enum';
import { ApiConnectionStatus } from 'src/engine/core-modules/api-connection/enums/api-connection-status.enum';
import { type ApiConnectionClientService } from 'src/engine/core-modules/api-connection/services/api-connection-client.service';
import { type ApiConnectionService } from 'src/engine/core-modules/api-connection/services/api-connection.service';
import { type ApiConnectionOperation } from 'src/engine/core-modules/api-connection/types/api-connection-operation.type';
import { type ToolProviderContext } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider-context.type';
import { ApiConnectionToolProvider } from 'src/engine/core-modules/tool-provider/providers/api-connection-tool.provider';
import { type PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

const WORKSPACE_ID = '20202020-0000-4000-8000-000000000001';
const CONNECTION_ID = '3f2b9c1e-1111-2222-3333-444455556666';

const countOperation: ApiConnectionOperation = {
  name: 'search_contacts_count',
  description: 'Count contacts in the GetLeads database',
  method: 'POST',
  path: '/contacts/search/count',
  parameters: [],
  requestBodySchema: {
    type: 'object',
    properties: { company_size_min: { type: 'integer' } },
  },
  isEnabled: true,
};

const buildConnection = (
  overrides: Partial<ApiConnectionEntity> = {},
): ApiConnectionEntity =>
  ({
    id: CONNECTION_ID,
    workspaceId: WORKSPACE_ID,
    name: 'GetLeads',
    baseUrl: 'https://app.getleads.io/api/v1',
    authType: ApiConnectionAuthType.BEARER,
    authHeaderName: null,
    secret: null,
    defaultHeaders: {},
    operations: [
      countOperation,
      { ...countOperation, name: 'disabled_operation', isEnabled: false },
    ],
    testOperationName: null,
    testArguments: null,
    openApiSpecUrl: null,
    status: ApiConnectionStatus.CONNECTED,
    lastErrorMessage: null,
    lastTestedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as ApiConnectionEntity;

const context = {
  workspaceId: WORKSPACE_ID,
  roleId: 'role-1',
  rolePermissionConfig: { unionOf: ['role-1'] },
} as ToolProviderContext;

describe('ApiConnectionToolProvider', () => {
  let apiConnectionService: jest.Mocked<
    Pick<ApiConnectionService, 'findAllByWorkspace' | 'findByIdOrThrow'>
  >;
  let apiConnectionClientService: jest.Mocked<
    Pick<ApiConnectionClientService, 'callOperation'>
  >;
  let permissionsService: jest.Mocked<
    Pick<PermissionsService, 'checkRolesPermissions'>
  >;
  let provider: ApiConnectionToolProvider;

  beforeEach(() => {
    apiConnectionService = {
      findAllByWorkspace: jest.fn(),
      findByIdOrThrow: jest.fn(),
    };
    apiConnectionClientService = { callOperation: jest.fn() };
    permissionsService = { checkRolesPermissions: jest.fn() };

    provider = new ApiConnectionToolProvider(
      apiConnectionService as unknown as ApiConnectionService,
      apiConnectionClientService as unknown as ApiConnectionClientService,
      permissionsService as unknown as PermissionsService,
    );
  });

  it('is only available with the integrations permission', async () => {
    permissionsService.checkRolesPermissions.mockResolvedValue(false);

    expect(await provider.isAvailable(context)).toBe(false);
    expect(permissionsService.checkRolesPermissions).toHaveBeenCalledWith(
      context.rolePermissionConfig,
      WORKSPACE_ID,
      'MCP_SERVERS',
    );
  });

  it('exposes enabled operations of connected connections only', async () => {
    apiConnectionService.findAllByWorkspace.mockResolvedValue([
      buildConnection(),
      buildConnection({
        id: '99999999-1111-2222-3333-444455556666',
        status: ApiConnectionStatus.ERROR,
      }),
    ]);

    const descriptors = await provider.generateDescriptors(context);

    expect(apiConnectionService.findAllByWorkspace).toHaveBeenCalledWith(
      WORKSPACE_ID,
    );
    expect(descriptors).toEqual([
      {
        name: 'getleads_search_contacts_count_3f2b9c1e',
        label: expect.any(String),
        description: 'GetLeads: Count contacts in the GetLeads database',
        category: ToolCategory.API_CONNECTION,
        executionRef: {
          kind: 'static',
          toolId: `${CONNECTION_ID}::search_contacts_count`,
        },
        inputSchema: {
          type: 'object',
          properties: { company_size_min: { type: 'integer' } },
          additionalProperties: true,
        },
      },
    ]);
  });

  it('omits schemas when asked for the catalog only', async () => {
    apiConnectionService.findAllByWorkspace.mockResolvedValue([
      buildConnection(),
    ]);

    const [descriptor] = await provider.generateDescriptors(context, {
      includeSchemas: false,
    });

    expect(descriptor).not.toHaveProperty('inputSchema');
  });

  it('calls the operation on the connection from the tool id, scoped to the workspace', async () => {
    const connection = buildConnection();

    apiConnectionService.findByIdOrThrow.mockResolvedValue(connection);
    apiConnectionClientService.callOperation.mockResolvedValue({
      toolOutput: { success: true, message: 'ok', result: { count: 1200 } },
      request: { method: 'POST', url: 'https://app.getleads.io/x' },
      durationMs: 12,
    });

    const output = await provider.executeStaticTool(
      `${CONNECTION_ID}::search_contacts_count`,
      { company_size_min: 1 },
      context,
    );

    expect(apiConnectionService.findByIdOrThrow).toHaveBeenCalledWith(
      CONNECTION_ID,
      WORKSPACE_ID,
    );
    expect(apiConnectionClientService.callOperation).toHaveBeenCalledWith({
      connection,
      operationName: 'search_contacts_count',
      args: { company_size_min: 1 },
    });
    expect(output).toEqual({
      success: true,
      message: 'ok',
      result: { count: 1200 },
    });
  });

  it('rejects a malformed tool id', async () => {
    await expect(
      provider.executeStaticTool('not-a-tool-id', {}, context),
    ).rejects.toThrow(/Malformed API connection tool id/);
  });
});
