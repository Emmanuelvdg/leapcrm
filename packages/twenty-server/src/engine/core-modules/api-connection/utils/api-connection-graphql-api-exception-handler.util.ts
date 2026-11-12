import { assertUnreachable } from 'twenty-shared/utils';

import { ApiConnectionExceptionCode } from 'src/engine/core-modules/api-connection/api-connection-exception-code.enum';
import { ApiConnectionException } from 'src/engine/core-modules/api-connection/api-connection.exception';
import {
  ConflictError,
  NotFoundError,
  UserInputError,
} from 'src/engine/core-modules/graphql/utils/graphql-errors.util';

export const apiConnectionGraphqlApiExceptionHandler = (error: Error) => {
  if (error instanceof ApiConnectionException) {
    const code = error.code;

    switch (code) {
      case ApiConnectionExceptionCode.CONNECTION_NOT_FOUND:
      case ApiConnectionExceptionCode.OPERATION_NOT_FOUND:
        throw new NotFoundError(error);
      case ApiConnectionExceptionCode.INVALID_CONFIGURATION:
      case ApiConnectionExceptionCode.INVALID_ARGUMENTS:
        throw new UserInputError(error);
      case ApiConnectionExceptionCode.OPEN_API_IMPORT_FAILED:
        throw new ConflictError(error);
      default: {
        return assertUnreachable(code);
      }
    }
  }

  throw error;
};
