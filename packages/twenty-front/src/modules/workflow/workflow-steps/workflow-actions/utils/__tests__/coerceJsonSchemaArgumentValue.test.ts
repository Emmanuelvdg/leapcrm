import { coerceJsonSchemaArgumentValue } from '@/workflow/workflow-steps/workflow-actions/utils/coerceJsonSchemaArgumentValue';

describe('coerceJsonSchemaArgumentValue', () => {
  it('drops empty values', () => {
    expect(coerceJsonSchemaArgumentValue('', 'string')).toBeUndefined();
    expect(coerceJsonSchemaArgumentValue(null, 'number')).toBeUndefined();
  });

  it('converts literal numbers and booleans', () => {
    expect(coerceJsonSchemaArgumentValue('25', 'integer')).toBe(25);
    expect(coerceJsonSchemaArgumentValue('1.5', 'number')).toBe(1.5);
    expect(coerceJsonSchemaArgumentValue('true', 'boolean')).toBe(true);
    expect(coerceJsonSchemaArgumentValue('false', 'boolean')).toBe(false);
  });

  it('parses JSON for object and array fields', () => {
    expect(coerceJsonSchemaArgumentValue('{"a":1}', 'object')).toEqual({
      a: 1,
    });
    expect(coerceJsonSchemaArgumentValue('["x"]', 'array')).toEqual(['x']);
  });

  it('keeps values with variables as strings', () => {
    expect(coerceJsonSchemaArgumentValue('{{trigger.count}}', 'number')).toBe(
      '{{trigger.count}}',
    );
  });

  it('keeps unparseable values as typed', () => {
    expect(coerceJsonSchemaArgumentValue('abc', 'number')).toBe('abc');
    expect(coerceJsonSchemaArgumentValue('{bad', 'object')).toBe('{bad');
    expect(coerceJsonSchemaArgumentValue('hello', 'string')).toBe('hello');
  });
});
