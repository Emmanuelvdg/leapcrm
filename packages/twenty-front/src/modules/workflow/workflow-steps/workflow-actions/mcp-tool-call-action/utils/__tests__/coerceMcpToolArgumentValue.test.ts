import { coerceMcpToolArgumentValue } from '@/workflow/workflow-steps/workflow-actions/mcp-tool-call-action/utils/coerceMcpToolArgumentValue';

describe('coerceMcpToolArgumentValue', () => {
  it('drops empty values', () => {
    expect(coerceMcpToolArgumentValue('', 'string')).toBeUndefined();
    expect(coerceMcpToolArgumentValue(null, 'number')).toBeUndefined();
  });

  it('converts literal numbers and booleans', () => {
    expect(coerceMcpToolArgumentValue('25', 'integer')).toBe(25);
    expect(coerceMcpToolArgumentValue('1.5', 'number')).toBe(1.5);
    expect(coerceMcpToolArgumentValue('true', 'boolean')).toBe(true);
    expect(coerceMcpToolArgumentValue('false', 'boolean')).toBe(false);
  });

  it('parses JSON for object and array fields', () => {
    expect(coerceMcpToolArgumentValue('{"a":1}', 'object')).toEqual({ a: 1 });
    expect(coerceMcpToolArgumentValue('["x"]', 'array')).toEqual(['x']);
  });

  it('keeps values with variables as strings', () => {
    expect(coerceMcpToolArgumentValue('{{trigger.count}}', 'number')).toBe(
      '{{trigger.count}}',
    );
  });

  it('keeps unparseable values as typed', () => {
    expect(coerceMcpToolArgumentValue('abc', 'number')).toBe('abc');
    expect(coerceMcpToolArgumentValue('{bad', 'object')).toBe('{bad');
    expect(coerceMcpToolArgumentValue('hello', 'string')).toBe('hello');
  });
});
