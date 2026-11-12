import { ApiConnectionAuthType } from 'src/engine/core-modules/api-connection/enums/api-connection-auth-type.enum';
import { type ApiConnectionOperation } from 'src/engine/core-modules/api-connection/types/api-connection-operation.type';
import {
  type ApiOperationRequestConfig,
  buildApiOperationRequest,
} from 'src/engine/core-modules/api-connection/utils/build-api-operation-request.util';

const PLACEHOLDER_KEY = 'glb_live_PLACEHOLDER_KEY';

const bearerConfig: ApiOperationRequestConfig = {
  baseUrl: 'https://app.getleads.io/api/v1',
  authType: ApiConnectionAuthType.BEARER,
  authHeaderName: null,
  secret: PLACEHOLDER_KEY,
  defaultHeaders: {},
};

const countOperation: ApiConnectionOperation = {
  name: 'search_contacts_count',
  description: 'Count contacts',
  method: 'POST',
  path: '/contacts/search/count',
  parameters: [],
  requestBodySchema: {
    type: 'object',
    properties: { company_size_min: { type: 'integer' } },
  },
  isEnabled: true,
};

const getContactOperation: ApiConnectionOperation = {
  name: 'get_contact',
  description: 'Get a contact',
  method: 'GET',
  path: '/contacts/{contactId}',
  parameters: [
    { name: 'contactId', in: 'path', required: true },
    { name: 'fields', in: 'query', required: false },
    { name: 'X-Request-Id', in: 'header', required: false },
  ],
  requestBodySchema: null,
  isEnabled: true,
};

describe('buildApiOperationRequest', () => {
  it('builds the GetLeads count request with a bearer token and JSON body', () => {
    const request = buildApiOperationRequest({
      config: bearerConfig,
      operation: countOperation,
      args: { company_size_min: 1 },
    });

    expect(request).toEqual({
      method: 'POST',
      url: 'https://app.getleads.io/api/v1/contacts/search/count',
      headers: {
        Authorization: `Bearer ${PLACEHOLDER_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: { company_size_min: 1 },
    });
  });

  it('puts extra arguments in a flattened body when the schema allows it', () => {
    const request = buildApiOperationRequest({
      config: bearerConfig,
      operation: countOperation,
      args: { company_size_min: 10, country: 'AU' },
    });

    expect(request.body).toEqual({ company_size_min: 10, country: 'AU' });
  });

  it('fills path, query and header parameters', () => {
    const request = buildApiOperationRequest({
      config: bearerConfig,
      operation: getContactOperation,
      args: {
        contactId: 'a b/c',
        fields: ['email', 'phone'],
        'X-Request-Id': 'r1',
      },
    });

    expect(request.url).toBe(
      'https://app.getleads.io/api/v1/contacts/a%20b%2Fc?fields=email&fields=phone',
    );
    expect(request.headers['X-Request-Id']).toBe('r1');
    expect(request.body).toBeUndefined();
  });

  it.each(['..', '.', ''])(
    'rejects the path parameter value "%s" so the URL cannot leave the base path',
    (contactId) => {
      expect(() =>
        buildApiOperationRequest({
          config: bearerConfig,
          operation: getContactOperation,
          args: { contactId },
        }),
      ).toThrow(/cannot be empty/);
    },
  );

  it('rejects missing required parameters', () => {
    expect(() =>
      buildApiOperationRequest({
        config: bearerConfig,
        operation: getContactOperation,
        args: {},
      }),
    ).toThrow('Missing required parameter "contactId"');
  });

  it('sends the key in a custom header for API key header auth', () => {
    const request = buildApiOperationRequest({
      config: {
        ...bearerConfig,
        authType: ApiConnectionAuthType.API_KEY_HEADER,
        authHeaderName: 'X-API-Key',
      },
      operation: countOperation,
      args: {},
    });

    expect(request.headers['X-API-Key']).toBe(PLACEHOLDER_KEY);
    expect(request.headers.Authorization).toBeUndefined();
  });

  it('sends no auth header when auth is NONE', () => {
    const request = buildApiOperationRequest({
      config: {
        ...bearerConfig,
        authType: ApiConnectionAuthType.NONE,
        secret: null,
      },
      operation: countOperation,
      args: {},
    });

    expect(request.headers.Authorization).toBeUndefined();
  });

  it('does not let default headers or header arguments replace the auth header', () => {
    const request = buildApiOperationRequest({
      config: {
        ...bearerConfig,
        defaultHeaders: {
          authorization: 'Bearer attacker',
          'X-Client': 'leap',
        },
      },
      operation: {
        ...getContactOperation,
        parameters: [
          ...getContactOperation.parameters,
          { name: 'Authorization', in: 'header', required: false },
        ],
      },
      args: { contactId: '1', Authorization: 'Bearer attacker' },
    });

    expect(request.headers).toEqual({
      'X-Client': 'leap',
      Accept: 'application/json',
      Authorization: `Bearer ${PLACEHOLDER_KEY}`,
    });
  });

  it('fails without a key when auth needs one', () => {
    expect(() =>
      buildApiOperationRequest({
        config: { ...bearerConfig, secret: null },
        operation: countOperation,
        args: {},
      }),
    ).toThrow('This API connection has no API key');
  });

  it('keeps query parameters from the base URL', () => {
    const request = buildApiOperationRequest({
      config: {
        ...bearerConfig,
        baseUrl: 'https://api.example.com/v2?version=3',
      },
      operation: getContactOperation,
      args: { contactId: '42', fields: 'email' },
    });

    expect(request.url).toBe(
      'https://api.example.com/v2/contacts/42?version=3&fields=email',
    );
  });

  it('nests the body under "body" when a body property collides with a parameter', () => {
    const request = buildApiOperationRequest({
      config: bearerConfig,
      operation: {
        ...countOperation,
        parameters: [
          { name: 'company_size_min', in: 'query', required: false },
        ],
      },
      args: { company_size_min: 5, body: { company_size_min: 7 } },
    });

    expect(request.url).toContain('?company_size_min=5');
    expect(request.body).toEqual({ company_size_min: 7 });
  });
});
