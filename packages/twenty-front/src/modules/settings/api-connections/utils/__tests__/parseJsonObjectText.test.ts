import { parseJsonObjectText } from '@/settings/api-connections/utils/parseJsonObjectText';

describe('parseJsonObjectText', () => {
  it('treats empty text as no value', () => {
    expect(parseJsonObjectText('  ')).toEqual({ isValid: true, value: null });
  });

  it('parses a JSON object', () => {
    expect(parseJsonObjectText('{ "company_size_min": 1 }')).toEqual({
      isValid: true,
      value: { company_size_min: 1 },
    });
  });

  it.each(['[1]', '"text"', '{ nope', 'null'])('rejects %s', (text) => {
    expect(parseJsonObjectText(text).isValid).toBe(false);
  });
});
