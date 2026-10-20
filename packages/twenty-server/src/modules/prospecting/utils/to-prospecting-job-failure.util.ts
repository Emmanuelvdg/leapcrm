import { type ProspectingJobFailure } from 'src/engine/core-modules/prospecting-job/types/prospecting-job-failure.type';
import { DiscoveryProviderException } from 'src/modules/prospecting/discovery/exceptions/discovery-provider.exception';
import { isRetryableDiscoveryProviderExceptionCode } from 'src/modules/prospecting/discovery/utils/is-retryable-discovery-provider-exception-code.util';
import { ProspectingException } from 'src/modules/prospecting/exceptions/prospecting.exception';

// Unknown errors are retried: they are usually transient (database or network)
// and the attempt limit stops a real bug from looping.
export const toProspectingJobFailure = (
  error: unknown,
): ProspectingJobFailure => {
  if (error instanceof DiscoveryProviderException) {
    return {
      code: error.code,
      message: error.message,
      isRetryable: isRetryableDiscoveryProviderExceptionCode(error.code),
    };
  }

  if (error instanceof ProspectingException) {
    return { code: error.code, message: error.message, isRetryable: false };
  }

  return {
    code: 'UNEXPECTED_ERROR',
    message: error instanceof Error ? error.message : String(error),
    isRetryable: true,
  };
};
