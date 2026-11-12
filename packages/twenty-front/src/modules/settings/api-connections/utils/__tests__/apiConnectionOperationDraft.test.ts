import {
  EMPTY_API_CONNECTION_OPERATION_DRAFT,
  parseApiConnectionOperationDraft,
  toApiConnectionOperationDraft,
} from '@/settings/api-connections/utils/apiConnectionOperationDraft';

const validDraft = {
  ...EMPTY_API_CONNECTION_OPERATION_DRAFT,
  name: 'get_contact',
  description: ' Get one contact ',
  path: '/contacts/{contactId}',
  parametersJson: '[{ "name": "contactId", "in": "path", "required": true }]',
};

describe('parseApiConnectionOperationDraft', () => {
  it('parses a valid draft', () => {
    expect(parseApiConnectionOperationDraft(validDraft)).toEqual({
      operation: {
        name: 'get_contact',
        description: 'Get one contact',
        method: 'GET',
        path: '/contacts/{contactId}',
        parameters: [{ name: 'contactId', in: 'path', required: true }],
        requestBodySchema: null,
        isEnabled: true,
      },
      error: null,
    });
  });

  it.each([
    [{ name: 'Get Contact' }, /lowercase letters/],
    [{ path: 'contacts' }, /must start with/],
    [{ parametersJson: '[' }, /valid JSON/],
    [
      {
        parametersJson: '[{ "name": "id", "in": "cookie", "required": true }]',
      },
      /list of objects/,
    ],
    [{ requestBodySchemaJson: '[1]' }, /JSON object/],
  ])('rejects %o', (changes, error) => {
    const result = parseApiConnectionOperationDraft({
      ...validDraft,
      ...changes,
    });

    expect(result.operation).toBeNull();
    expect(result.error).toMatch(error);
  });

  it('round-trips an operation through a draft', () => {
    const operation = {
      name: 'search_contacts_count',
      description: 'Count contacts',
      method: 'POST' as const,
      path: '/contacts/search/count',
      parameters: [],
      requestBodySchema: { type: 'object', properties: {} },
      isEnabled: false,
    };

    expect(
      parseApiConnectionOperationDraft(toApiConnectionOperationDraft(operation))
        .operation,
    ).toEqual(operation);
  });
});
