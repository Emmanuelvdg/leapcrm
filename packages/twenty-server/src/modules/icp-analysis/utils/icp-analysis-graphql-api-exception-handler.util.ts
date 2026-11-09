import { assertUnreachable } from 'twenty-shared/utils';

import {
  NotFoundError,
  UserInputError,
} from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import { IcpAnalysisException } from 'src/modules/icp-analysis/exceptions/icp-analysis.exception';

export const icpAnalysisGraphqlApiExceptionHandler = (error: Error) => {
  if (error instanceof IcpAnalysisException) {
    const code = error.code;

    switch (code) {
      case 'MODEL_NOT_FOUND':
        throw new NotFoundError(error);
      case 'MODEL_NOT_ANALYZED':
        throw new UserInputError(error);
      default:
        return assertUnreachable(code);
    }
  }

  throw error;
};
