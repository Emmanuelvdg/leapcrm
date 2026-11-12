import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { assertUnreachable } from 'twenty-shared/utils';

import { type IcpAnalysisExceptionCode } from 'src/modules/icp-analysis/exceptions/icp-analysis-exception-code.type';
import { CustomException } from 'src/utils/custom-exception';

const getIcpAnalysisExceptionUserFriendlyMessage = (
  code: IcpAnalysisExceptionCode,
) => {
  switch (code) {
    case 'MODEL_NOT_FOUND':
      return msg`ICP model not found.`;
    case 'MODEL_NOT_ANALYZED':
      return msg`Run the analysis before suggesting weights.`;
    case 'MODEL_ALREADY_ACTIVE':
      return msg`This ICP model is already active.`;
    case 'MODEL_HAS_NO_CRITERIA':
      return msg`Add at least one criterion before activating the model.`;
    default:
      return assertUnreachable(code);
  }
};

export class IcpAnalysisException extends CustomException<IcpAnalysisExceptionCode> {
  constructor(
    message: string,
    code: IcpAnalysisExceptionCode,
    { userFriendlyMessage }: { userFriendlyMessage?: MessageDescriptor } = {},
  ) {
    super(message, code, {
      userFriendlyMessage:
        userFriendlyMessage ?? getIcpAnalysisExceptionUserFriendlyMessage(code),
    });
  }
}
