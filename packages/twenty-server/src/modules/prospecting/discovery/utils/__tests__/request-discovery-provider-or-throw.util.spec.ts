import { AxiosError, type AxiosInstance, type AxiosResponse } from 'axios';

import { type DiscoveryProviderExceptionCode } from 'src/modules/prospecting/discovery/exceptions/discovery-provider.exception';
import { isRetryableDiscoveryProviderExceptionCode } from 'src/modules/prospecting/discovery/utils/is-retryable-discovery-provider-exception-code.util';
import { requestDiscoveryProviderOrThrow } from 'src/modules/prospecting/discovery/utils/request-discovery-provider-or-throw.util';

const requestWithFailure = (error: Error) =>
  requestDiscoveryProviderOrThrow({
    httpClient: {
      request: jest.fn().mockRejectedValue(error),
    } as unknown as AxiosInstance,
    providerId: 'test-source',
    requestConfig: { url: '/' },
  });

const httpError = (status: number) =>
  new AxiosError('failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
  } as AxiosResponse);

describe('requestDiscoveryProviderOrThrow', () => {
  it.each<[string, Error, DiscoveryProviderExceptionCode, boolean]>([
    ['HTTP 429', httpError(429), 'PROVIDER_RATE_LIMITED', true],
    ['HTTP 503', httpError(503), 'PROVIDER_UNAVAILABLE', true],
    ['HTTP 504', httpError(504), 'PROVIDER_TIMEOUT', true],
    ['HTTP 400', httpError(400), 'PROVIDER_REQUEST_REJECTED', false],
    [
      'a client timeout',
      new AxiosError('timeout', 'ECONNABORTED'),
      'PROVIDER_TIMEOUT',
      true,
    ],
    [
      'a network failure',
      new AxiosError('reset', 'ECONNRESET'),
      'PROVIDER_UNAVAILABLE',
      true,
    ],
  ])('classifies %s', async (_label, error, code, isRetryable) => {
    await expect(requestWithFailure(error)).rejects.toMatchObject({ code });
    expect(isRetryableDiscoveryProviderExceptionCode(code)).toBe(isRetryable);
  });

  it('returns the response body on success', async () => {
    const body = await requestDiscoveryProviderOrThrow({
      httpClient: {
        request: jest.fn().mockResolvedValue({ data: { ok: true } }),
      } as unknown as AxiosInstance,
      providerId: 'test-source',
      requestConfig: { url: '/' },
    });

    expect(body).toEqual({ ok: true });
  });
});
