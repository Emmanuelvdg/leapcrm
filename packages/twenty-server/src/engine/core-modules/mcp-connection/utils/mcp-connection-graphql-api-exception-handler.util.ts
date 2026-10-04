import { assertUnreachable } from 'twenty-shared/utils';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UserInputError,
} from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import { McpConnectionExceptionCode } from 'src/engine/core-modules/mcp-connection/mcp-connection-exception-code.enum';
import { McpConnectionException } from 'src/engine/core-modules/mcp-connection/mcp-connection.exception';

export const mcpConnectionGraphqlApiExceptionHandler = (error: Error) => {
  if (error instanceof McpConnectionException) {
    const code = error.code;

    switch (code) {
      case McpConnectionExceptionCode.CONNECTION_NOT_FOUND:
      case McpConnectionExceptionCode.TOOL_NOT_FOUND:
        throw new NotFoundError(error);
      case McpConnectionExceptionCode.INVALID_REQUEST:
      case McpConnectionExceptionCode.INVALID_STATE:
      case McpConnectionExceptionCode.CLIENT_CREDENTIALS_NOT_CONFIGURED:
        throw new UserInputError(error);
      case McpConnectionExceptionCode.FORBIDDEN:
        throw new ForbiddenError(error);
      case McpConnectionExceptionCode.DISCOVERY_FAILED:
      case McpConnectionExceptionCode.DYNAMIC_CLIENT_REGISTRATION_FAILED:
      case McpConnectionExceptionCode.TOKEN_EXCHANGE_FAILED:
      case McpConnectionExceptionCode.REFRESH_FAILED:
      case McpConnectionExceptionCode.MCP_REQUEST_FAILED:
        throw new ConflictError(error);
      default: {
        return assertUnreachable(code);
      }
    }
  }

  throw error;
};
