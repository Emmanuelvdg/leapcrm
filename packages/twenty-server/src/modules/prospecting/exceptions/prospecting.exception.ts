import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { assertUnreachable } from 'twenty-shared/utils';

import { type ProspectingExceptionCode } from 'src/modules/prospecting/exceptions/prospecting-exception-code.type';
import { CustomException } from 'src/utils/custom-exception';

const getProspectingExceptionUserFriendlyMessage = (
  code: ProspectingExceptionCode,
) => {
  switch (code) {
    case 'CAMPAIGN_NOT_FOUND':
      return msg`Prospecting campaign not found.`;
    case 'INVALID_CAMPAIGN_STATUS_TRANSITION':
      return msg`This action is not available for the campaign in its current status.`;
    case 'CAMPAIGN_NOT_STARTABLE':
      return msg`The campaign is not ready to start. Check its ideal customer profile and target number of candidates.`;
    case 'CAMPAIGN_STATUS_CONFLICT':
      return msg`The campaign changed while you were updating it. Refresh and try again.`;
    default:
      return assertUnreachable(code);
  }
};

export class ProspectingException extends CustomException<ProspectingExceptionCode> {
  constructor(
    message: string,
    code: ProspectingExceptionCode,
    { userFriendlyMessage }: { userFriendlyMessage?: MessageDescriptor } = {},
  ) {
    super(message, code, {
      userFriendlyMessage:
        userFriendlyMessage ?? getProspectingExceptionUserFriendlyMessage(code),
    });
  }
}
