import {
  parseOpenApiDocumentText,
  parseOpenApiOperations,
  toApiOperationName,
} from 'src/engine/core-modules/api-connection/utils/parse-open-api-operations.util';

const document = {
  openapi: '3.0.3',
  servers: [{ url: 'https://api.example.com/v1' }],
  components: {
    schemas: {
      ContactFilter: {
        type: 'object',
        properties: {
          company_size_min: { type: 'integer', nullable: true, example: 10 },
          owner: { $ref: '#/components/schemas/Owner' },
        },
        required: ['company_size_min'],
      },
      Owner: { type: 'object', properties: { id: { type: 'string' } } },
    },
    parameters: {
      ContactId: {
        name: 'contactId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    },
  },
  paths: {
    '/contacts/search/count': {
      post: {
        operationId: 'countContacts',
        summary: 'Count contacts',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ContactFilter' },
            },
          },
        },
      },
    },
    '/contacts/{contactId}': {
      parameters: [{ $ref: '#/components/parameters/ContactId' }],
      get: {
        summary: 'Get a contact',
        parameters: [
          { name: 'session', in: 'cookie', schema: { type: 'string' } },
          { name: 'fields', in: 'query', schema: { type: 'string' } },
        ],
      },
    },
    '/uploads': {
      post: {
        operationId: 'upload',
        requestBody: {
          content: { 'multipart/form-data': { schema: { type: 'object' } } },
        },
      },
    },
  },
};

describe('parseOpenApiOperations', () => {
  it('maps operations, resolves refs and converts schemas', () => {
    const result = parseOpenApiOperations(document);

    expect(result.suggestedBaseUrl).toBe('https://api.example.com/v1');
    expect(result.skipped).toEqual(['POST /uploads: request body is not JSON']);
    expect(result.operations).toEqual([
      {
        name: 'count_contacts',
        description: 'Count contacts',
        method: 'POST',
        path: '/contacts/search/count',
        parameters: [],
        requestBodySchema: {
          type: 'object',
          properties: {
            company_size_min: { type: ['integer', 'null'] },
            owner: { type: 'object', properties: { id: { type: 'string' } } },
          },
          required: ['company_size_min'],
        },
        isEnabled: false,
      },
      {
        name: 'get_contacts_contact_id',
        description: 'Get a contact',
        method: 'GET',
        path: '/contacts/{contactId}',
        parameters: [
          {
            name: 'contactId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'fields',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
        ],
        requestBodySchema: null,
        isEnabled: false,
      },
    ]);
  });

  it('does not loop on recursive schemas', () => {
    const result = parseOpenApiOperations({
      openapi: '3.1.0',
      components: {
        schemas: {
          Node: {
            type: 'object',
            properties: { child: { $ref: '#/components/schemas/Node' } },
          },
        },
      },
      paths: {
        '/nodes': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Node' },
                },
              },
            },
          },
        },
      },
    });

    expect(result.operations[0].name).toBe('post_nodes');
    expect(result.operations[0].requestBodySchema).toMatchObject({
      type: 'object',
    });
  });

  it('adds undeclared path placeholders and dedupes names', () => {
    const result = parseOpenApiOperations({
      openapi: '3.0.0',
      paths: {
        '/a/{id}': { get: { operationId: 'getThing' } },
        '/b': { get: { operationId: 'get_thing' } },
      },
    });

    expect(result.operations.map((operation) => operation.name)).toEqual([
      'get_thing',
      'get_thing_2',
    ]);
    expect(result.operations[0].parameters).toEqual([
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ]);
  });

  it('rejects Swagger 2.0 and non OpenAPI documents', () => {
    expect(() => parseOpenApiOperations({ swagger: '2.0', paths: {} })).toThrow(
      /Swagger 2.0/,
    );
    expect(() => parseOpenApiOperations({ paths: {} })).toThrow(
      /not an OpenAPI 3.x document/,
    );
  });
});

describe('parseOpenApiDocumentText', () => {
  it('rejects YAML and invalid JSON', () => {
    expect(() => parseOpenApiDocumentText('openapi: 3.0.0')).toThrow(
      /Only JSON OpenAPI documents/,
    );
    expect(() => parseOpenApiDocumentText('{ nope')).toThrow(/not valid JSON/);
  });
});

describe('toApiOperationName', () => {
  it.each([
    ['countContacts', 'count_contacts'],
    ['GET_/contacts/{id}', 'get_contacts_id'],
    ['search.Contacts-v2', 'search_contacts_v2'],
  ])('turns %s into %s', (input, expected) => {
    expect(toApiOperationName(input)).toBe(expected);
  });
});
