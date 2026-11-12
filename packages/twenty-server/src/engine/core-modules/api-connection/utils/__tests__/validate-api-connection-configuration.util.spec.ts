import { ApiConnectionAuthType } from 'src/engine/core-modules/api-connection/enums/api-connection-auth-type.enum';
import {
  type ApiConnectionConfiguration,
  MAX_ENABLED_API_CONNECTION_OPERATIONS,
  validateApiConnectionConfiguration,
} from 'src/engine/core-modules/api-connection/utils/validate-api-connection-configuration.util';

const validOperation = {
  name: 'search_contacts_count',
  description: 'Count contacts',
  method: 'POST',
  path: '/contacts/search/count',
  parameters: [],
  requestBodySchema: { type: 'object', properties: {} },
  isEnabled: true,
};

const baseConfiguration: ApiConnectionConfiguration = {
  baseUrl: 'https://app.getleads.io/api/v1',
  authType: ApiConnectionAuthType.BEARER,
  authHeaderName: null,
  defaultHeaders: {},
  operations: [validOperation],
  testOperationName: 'search_contacts_count',
};

describe('validateApiConnectionConfiguration', () => {
  it('accepts the GetLeads configuration', () => {
    expect(validateApiConnectionConfiguration(baseConfiguration)).toEqual([
      validOperation,
    ]);
  });

  it.each([
    ['ftp://example.com', /http or https/],
    ['not a url', /not a valid URL/],
    ['https://user:pass@example.com', /cannot contain credentials/],
  ])('rejects the base URL %s', (baseUrl, error) => {
    expect(() =>
      validateApiConnectionConfiguration({ ...baseConfiguration, baseUrl }),
    ).toThrow(error);
  });

  it('rejects a default header that would carry the key', () => {
    expect(() =>
      validateApiConnectionConfiguration({
        ...baseConfiguration,
        defaultHeaders: { Authorization: 'Bearer something' },
      }),
    ).toThrow(/would carry the API key/);

    expect(() =>
      validateApiConnectionConfiguration({
        ...baseConfiguration,
        authType: ApiConnectionAuthType.API_KEY_HEADER,
        authHeaderName: 'X-API-Key',
        defaultHeaders: { 'x-api-key': 'something' },
      }),
    ).toThrow(/would carry the API key/);
  });

  it('requires a header name for API key header auth', () => {
    expect(() =>
      validateApiConnectionConfiguration({
        ...baseConfiguration,
        authType: ApiConnectionAuthType.API_KEY_HEADER,
      }),
    ).toThrow(/valid header name/);
  });

  it('rejects path placeholders without a path parameter and the reverse', () => {
    expect(() =>
      validateApiConnectionConfiguration({
        ...baseConfiguration,
        operations: [{ ...validOperation, path: '/contacts/{id}' }],
      }),
    ).toThrow(/without a path parameter/);

    expect(() =>
      validateApiConnectionConfiguration({
        ...baseConfiguration,
        operations: [
          {
            ...validOperation,
            parameters: [{ name: 'id', in: 'path', required: true }],
          },
        ],
      }),
    ).toThrow(/not in its path/);
  });

  it('rejects duplicate operation names and invalid shapes', () => {
    expect(() =>
      validateApiConnectionConfiguration({
        ...baseConfiguration,
        operations: [validOperation, validOperation],
      }),
    ).toThrow(/used twice/);

    expect(() =>
      validateApiConnectionConfiguration({
        ...baseConfiguration,
        operations: [{ ...validOperation, name: 'Has Spaces' }],
      }),
    ).toThrow(/Invalid operation at 0.name/);
  });

  it('caps the number of enabled operations', () => {
    const operations = Array.from(
      { length: MAX_ENABLED_API_CONNECTION_OPERATIONS + 1 },
      (_, index) => ({ ...validOperation, name: `operation_${index}` }),
    );

    expect(() =>
      validateApiConnectionConfiguration({
        ...baseConfiguration,
        operations,
        testOperationName: null,
      }),
    ).toThrow(/At most 50 operations/);
  });

  it('requires the test operation to exist', () => {
    expect(() =>
      validateApiConnectionConfiguration({
        ...baseConfiguration,
        testOperationName: 'missing',
      }),
    ).toThrow(/Test operation "missing" does not exist/);
  });
});
