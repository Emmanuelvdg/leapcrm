import {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios';

import { type ApiConnectionEntity } from 'src/engine/core-modules/api-connection/entities/api-connection.entity';
import { ApiConnectionAuthType } from 'src/engine/core-modules/api-connection/enums/api-connection-auth-type.enum';
import { ApiConnectionStatus } from 'src/engine/core-modules/api-connection/enums/api-connection-status.enum';
import { ApiConnectionClientService } from 'src/engine/core-modules/api-connection/services/api-connection-client.service';
import { type ApiConnectionService } from 'src/engine/core-modules/api-connection/services/api-connection.service';
import { type SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';

const PLACEHOLDER_KEY = 'glb_live_PLACEHOLDER_KEY';
const WORKSPACE_ID = '20202020-0000-4000-8000-000000000001';

const connection = {
  id: 'connection-1',
  workspaceId: WORKSPACE_ID,
  name: 'GetLeads',
  baseUrl: 'https://app.getleads.io/api/v1',
  authType: ApiConnectionAuthType.BEARER,
  authHeaderName: null,
  secret: 'enc:v2:placeholder',
  defaultHeaders: {},
  operations: [
    {
      name: 'search_contacts_count',
      description: 'Count contacts',
      method: 'POST',
      path: '/contacts/search/count',
      parameters: [],
      requestBodySchema: { type: 'object', properties: {} },
      isEnabled: true,
    },
    {
      name: 'disabled_operation',
      description: 'Disabled',
      method: 'GET',
      path: '/disabled',
      parameters: [],
      requestBodySchema: null,
      isEnabled: false,
    },
  ],
  status: ApiConnectionStatus.CONNECTED,
} as unknown as ApiConnectionEntity;

describe('ApiConnectionClientService', () => {
  let request: jest.Mock;
  let getHttpClient: jest.Mock;
  let apiConnectionService: jest.Mocked<
    Pick<ApiConnectionService, 'getDecryptedSecret' | 'markError'>
  >;
  let service: ApiConnectionClientService;

  beforeEach(() => {
    request = jest.fn();
    getHttpClient = jest.fn().mockReturnValue({ request });
    apiConnectionService = {
      getDecryptedSecret: jest.fn().mockReturnValue(PLACEHOLDER_KEY),
      markError: jest.fn(),
    };

    service = new ApiConnectionClientService(
      apiConnectionService as unknown as ApiConnectionService,
      { getHttpClient } as unknown as SecureHttpClientService,
    );
  });

  it('sends the request through the SSRF-safe client without following redirects', async () => {
    request.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      data: '{"count":1200}',
    });

    const { toolOutput, request: summary } = await service.callOperation({
      connection,
      operationName: 'search_contacts_count',
      args: { company_size_min: 1 },
    });

    expect(getHttpClient).toHaveBeenCalledWith(
      expect.objectContaining({ maxRedirects: 0 }),
      { workspaceId: WORKSPACE_ID, source: 'api-connection' },
    );
    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      url: 'https://app.getleads.io/api/v1/contacts/search/count',
      headers: {
        Authorization: `Bearer ${PLACEHOLDER_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      data: '{"company_size_min":1}',
    });
    expect(toolOutput).toEqual({
      success: true,
      message: 'POST /api/v1/contacts/search/count returned 200',
      result: { count: 1200 },
      status: 200,
      statusText: 'OK',
    });
    expect(summary).toEqual({
      method: 'POST',
      url: 'https://app.getleads.io/api/v1/contacts/search/count',
    });
  });

  it('marks the connection as errored when the API rejects the key', async () => {
    request.mockResolvedValue({
      status: 401,
      statusText: 'Unauthorized',
      data: '{"error":"invalid key"}',
    });

    const { toolOutput } = await service.callOperation({
      connection,
      operationName: 'search_contacts_count',
      args: {},
    });

    expect(toolOutput.success).toBe(false);
    expect(toolOutput.error).toContain('failed with 401');
    expect(apiConnectionService.markError).toHaveBeenCalledWith(
      connection,
      expect.stringContaining('rejected the key'),
    );
  });

  it('never leaks the key from a network error', async () => {
    const error = new AxiosError(
      `connect ECONNREFUSED with Bearer ${PLACEHOLDER_KEY}`,
      'ECONNREFUSED',
      {
        headers: new AxiosHeaders({
          Authorization: `Bearer ${PLACEHOLDER_KEY}`,
        }),
      } as InternalAxiosRequestConfig,
    );

    request.mockRejectedValue(error);

    const { toolOutput } = await service.callOperation({
      connection,
      operationName: 'search_contacts_count',
      args: {},
    });

    expect(toolOutput.success).toBe(false);
    expect(JSON.stringify(toolOutput)).not.toContain(PLACEHOLDER_KEY);
    expect(toolOutput.error).toBe(
      'POST /api/v1/contacts/search/count failed: ECONNREFUSED',
    );
  });

  it('refuses disabled operations unless explicitly allowed', async () => {
    await expect(
      service.callOperation({
        connection,
        operationName: 'disabled_operation',
        args: {},
      }),
    ).rejects.toThrow(/is not enabled/);

    request.mockResolvedValue({ status: 200, statusText: 'OK', data: 'plain' });

    const { toolOutput } = await service.callOperation({
      connection,
      operationName: 'disabled_operation',
      args: {},
      allowDisabledOperation: true,
    });

    expect(toolOutput.result).toEqual({ text: 'plain' });
  });
});
