import { type ApiConnectionOperation } from '@/settings/api-connections/types/ApiConnectionOperation';
import { mergeApiConnectionOperations } from '@/settings/api-connections/utils/mergeApiConnectionOperations';

const buildOperation = (
  name: string,
  path: string,
): ApiConnectionOperation => ({
  name,
  description: '',
  method: 'GET',
  path,
  parameters: [],
  requestBodySchema: null,
  isEnabled: true,
});

describe('mergeApiConnectionOperations', () => {
  it('replaces operations with the same name and appends new ones in order', () => {
    expect(
      mergeApiConnectionOperations(
        [buildOperation('a', '/a'), buildOperation('b', '/b')],
        [buildOperation('b', '/b-v2'), buildOperation('c', '/c')],
      ).map((operation) => `${operation.name}:${operation.path}`),
    ).toEqual(['a:/a', 'b:/b-v2', 'c:/c']);
  });
});
