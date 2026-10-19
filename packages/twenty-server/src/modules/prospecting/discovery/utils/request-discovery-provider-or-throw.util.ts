import {
  type AxiosInstance,
  type AxiosRequestConfig,
  isAxiosError,
} from 'axios';

import { DiscoveryProviderException } from 'src/modules/prospecting/discovery/exceptions/discovery-provider.exception';

const getHttpFailureExceptionCode = (status: number) => {
  if (status === 429) {
    return 'PROVIDER_RATE_LIMITED';
  }

  if (status === 408 || status === 504) {
    return 'PROVIDER_TIMEOUT';
  }

  if (status >= 500) {
    return 'PROVIDER_UNAVAILABLE';
  }

  return 'PROVIDER_REQUEST_REJECTED';
};

export const requestDiscoveryProviderOrThrow = async ({
  httpClient,
  providerId,
  requestConfig,
}: {
  httpClient: AxiosInstance;
  providerId: string;
  requestConfig: AxiosRequestConfig;
}): Promise<unknown> => {
  try {
    const response = await httpClient.request(requestConfig);

    return response.data;
  } catch (error) {
    if (!isAxiosError(error)) {
      throw error;
    }

    if (error.response) {
      throw new DiscoveryProviderException(
        `${providerId} responded with HTTP ${error.response.status}`,
        getHttpFailureExceptionCode(error.response.status),
      );
    }

    throw new DiscoveryProviderException(
      `${providerId} request failed: ${error.code ?? error.message}`,
      error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
        ? 'PROVIDER_TIMEOUT'
        : 'PROVIDER_UNAVAILABLE',
    );
  }
};
