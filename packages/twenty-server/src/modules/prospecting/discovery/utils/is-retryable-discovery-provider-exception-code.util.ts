import { type DiscoveryProviderExceptionCode } from 'src/modules/prospecting/discovery/exceptions/discovery-provider.exception';

const RETRYABLE_DISCOVERY_PROVIDER_EXCEPTION_CODES =
  new Set<DiscoveryProviderExceptionCode>([
    'PROVIDER_UNAVAILABLE',
    'PROVIDER_RATE_LIMITED',
    'PROVIDER_TIMEOUT',
  ]);

export const isRetryableDiscoveryProviderExceptionCode = (
  code: DiscoveryProviderExceptionCode,
): boolean => RETRYABLE_DISCOVERY_PROVIDER_EXCEPTION_CODES.has(code);
