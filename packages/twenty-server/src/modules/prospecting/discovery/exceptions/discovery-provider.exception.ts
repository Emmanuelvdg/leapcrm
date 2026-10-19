import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { assertUnreachable } from 'twenty-shared/utils';

import { CustomException } from 'src/utils/custom-exception';

export type DiscoveryProviderExceptionCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_REQUEST_REJECTED'
  | 'PROVIDER_RESPONSE_INVALID'
  | 'UNSUPPORTED_DISCOVERY_REQUEST'
  | 'UNKNOWN_DISCOVERY_PROVIDER';

const getDiscoveryProviderExceptionUserFriendlyMessage = (
  code: DiscoveryProviderExceptionCode,
) => {
  switch (code) {
    case 'PROVIDER_UNAVAILABLE':
    case 'PROVIDER_TIMEOUT':
      return msg`A discovery source is temporarily unavailable. It will be retried.`;
    case 'PROVIDER_RATE_LIMITED':
      return msg`A discovery source is busy. It will be retried shortly.`;
    case 'PROVIDER_REQUEST_REJECTED':
    case 'PROVIDER_RESPONSE_INVALID':
      return msg`A discovery source could not process this campaign.`;
    case 'UNSUPPORTED_DISCOVERY_REQUEST':
      return msg`This discovery source does not support the campaign's criteria.`;
    case 'UNKNOWN_DISCOVERY_PROVIDER':
      return msg`This discovery source does not exist.`;
    default:
      return assertUnreachable(code);
  }
};

export class DiscoveryProviderException extends CustomException<DiscoveryProviderExceptionCode> {
  constructor(
    message: string,
    code: DiscoveryProviderExceptionCode,
    { userFriendlyMessage }: { userFriendlyMessage?: MessageDescriptor } = {},
  ) {
    super(message, code, {
      userFriendlyMessage:
        userFriendlyMessage ??
        getDiscoveryProviderExceptionUserFriendlyMessage(code),
    });
  }
}
