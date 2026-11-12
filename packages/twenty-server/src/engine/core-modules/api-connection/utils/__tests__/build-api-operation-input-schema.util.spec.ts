import { buildApiOperationInputSchema } from 'src/engine/core-modules/api-connection/utils/build-api-operation-input-schema.util';

describe('buildApiOperationInputSchema', () => {
  it('flattens an object body next to the parameters', () => {
    expect(
      buildApiOperationInputSchema({
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: true,
            description: 'Page size',
            schema: { type: 'integer' },
          },
        ],
        requestBodySchema: {
          type: 'object',
          properties: { company_size_min: { type: 'integer' } },
          required: ['company_size_min'],
        },
      }),
    ).toEqual({
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'Page size' },
        company_size_min: { type: 'integer' },
      },
      required: ['limit', 'company_size_min'],
      additionalProperties: true,
    });
  });

  it('closes the schema when the body forbids extra properties', () => {
    expect(
      buildApiOperationInputSchema({
        parameters: [],
        requestBodySchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      }),
    ).toEqual({ type: 'object', properties: {}, additionalProperties: false });
  });

  it('nests non-object bodies under "body"', () => {
    const bodySchema = { type: 'array', items: { type: 'string' } };

    expect(
      buildApiOperationInputSchema({
        parameters: [],
        requestBodySchema: bodySchema,
      }),
    ).toEqual({
      type: 'object',
      properties: { body: bodySchema },
      additionalProperties: false,
    });
  });

  it('defaults untyped parameters to strings', () => {
    expect(
      buildApiOperationInputSchema({
        parameters: [{ name: 'id', in: 'path', required: true }],
        requestBodySchema: null,
      }),
    ).toEqual({
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    });
  });
});
