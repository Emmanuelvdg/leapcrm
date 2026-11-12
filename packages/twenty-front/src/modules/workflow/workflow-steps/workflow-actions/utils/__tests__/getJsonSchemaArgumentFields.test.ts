import { getJsonSchemaArgumentFields } from '@/workflow/workflow-steps/workflow-actions/utils/getJsonSchemaArgumentFields';

describe('getJsonSchemaArgumentFields', () => {
  it('returns one field per schema property with its type and required flag', () => {
    expect(
      getJsonSchemaArgumentFields({
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: ['integer', 'null'] },
        },
        required: ['query'],
      }),
    ).toEqual([
      {
        name: 'query',
        type: 'string',
        description: 'Search query',
        isRequired: true,
      },
      {
        name: 'limit',
        type: 'integer',
        description: undefined,
        isRequired: false,
      },
    ]);
  });

  it('returns no fields for a missing or property-less schema', () => {
    expect(getJsonSchemaArgumentFields(null)).toEqual([]);
    expect(getJsonSchemaArgumentFields({ type: 'object' })).toEqual([]);
  });
});
