import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { assertUnreachable } from 'twenty-shared/utils';

import { ApiConnectionExceptionCode } from 'src/engine/core-modules/api-connection/api-connection-exception-code.enum';
import { CustomException } from 'src/utils/custom-exception';

const getApiConnectionExceptionUserFriendlyMessage = (
  code: ApiConnectionExceptionCode,
) => {
  switch (code) {
    case ApiConnectionExceptionCode.CONNECTION_NOT_FOUND:
      return msg`API connection not found.`;
    case ApiConnectionExceptionCode.OPERATION_NOT_FOUND:
      return msg`Operation not found on this API connection.`;
    case ApiConnectionExceptionCode.INVALID_CONFIGURATION:
      return msg`The API connection configuration is invalid.`;
    case ApiConnectionExceptionCode.INVALID_ARGUMENTS:
      return msg`The arguments for this API operation are invalid.`;
    case ApiConnectionExceptionCode.OPEN_API_IMPORT_FAILED:
      return msg`Could not import operations from this OpenAPI document.`;
    default:
      assertUnreachable(code);
  }
};

export class ApiConnectionException extends CustomException<ApiConnectionExceptionCode> {
  constructor(
    message: string,
    code: ApiConnectionExceptionCode,
    { userFriendlyMessage }: { userFriendlyMessage?: MessageDescriptor } = {},
  ) {
    super(message, code, {
      userFriendlyMessage:
        userFriendlyMessage ??
        getApiConnectionExceptionUserFriendlyMessage(code),
    });
  }
}
