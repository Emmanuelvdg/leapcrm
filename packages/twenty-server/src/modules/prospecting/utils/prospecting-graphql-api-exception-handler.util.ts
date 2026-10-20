import { assertUnreachable } from 'twenty-shared/utils';

import {
  ConflictError,
  NotFoundError,
  UserInputError,
} from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import { ProspectingException } from 'src/modules/prospecting/exceptions/prospecting.exception';

export const prospectingGraphqlApiExceptionHandler = (error: Error) => {
  if (error instanceof ProspectingException) {
    const code = error.code;

    switch (code) {
      case 'CAMPAIGN_NOT_FOUND':
        throw new NotFoundError(error);
      case 'INVALID_CAMPAIGN_STATUS_TRANSITION':
      case 'CAMPAIGN_NOT_STARTABLE':
      case 'CAMPAIGN_NOT_IMPORTABLE':
        throw new UserInputError(error);
      case 'CAMPAIGN_STATUS_CONFLICT':
        throw new ConflictError(error);
      default:
        return assertUnreachable(code);
    }
  }

  throw error;
};
