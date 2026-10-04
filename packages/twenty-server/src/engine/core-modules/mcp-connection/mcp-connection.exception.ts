import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { assertUnreachable } from 'twenty-shared/utils';

import { McpConnectionExceptionCode } from 'src/engine/core-modules/mcp-connection/mcp-connection-exception-code.enum';
import { CustomException } from 'src/utils/custom-exception';

const getMcpConnectionExceptionUserFriendlyMessage = (
  code: McpConnectionExceptionCode,
) => {
  switch (code) {
    case McpConnectionExceptionCode.CONNECTION_NOT_FOUND:
      return msg`MCP server connection not found.`;
    case McpConnectionExceptionCode.DISCOVERY_FAILED:
      return msg`Could not discover the MCP server's OAuth configuration.`;
    case McpConnectionExceptionCode.DYNAMIC_CLIENT_REGISTRATION_FAILED:
      return msg`Could not register this app with the MCP server.`;
    case McpConnectionExceptionCode.CLIENT_CREDENTIALS_NOT_CONFIGURED:
      return msg`This MCP server requires client credentials that haven't been configured.`;
    case McpConnectionExceptionCode.TOKEN_EXCHANGE_FAILED:
      return msg`Failed to exchange the authorization code for an access token.`;
    case McpConnectionExceptionCode.REFRESH_FAILED:
      return msg`Failed to refresh the access token.`;
    case McpConnectionExceptionCode.INVALID_STATE:
      return msg`The OAuth state parameter is invalid or expired.`;
    case McpConnectionExceptionCode.INVALID_REQUEST:
      return msg`The OAuth request is missing required parameters.`;
    case McpConnectionExceptionCode.FORBIDDEN:
      return msg`Not authorized to access this MCP server connection.`;
    case McpConnectionExceptionCode.MCP_REQUEST_FAILED:
      return msg`The MCP server returned an error.`;
    case McpConnectionExceptionCode.TOOL_NOT_FOUND:
      return msg`Tool not found on this MCP server.`;
    default:
      assertUnreachable(code);
  }
};

export class McpConnectionException extends CustomException<McpConnectionExceptionCode> {
  constructor(
    message: string,
    code: McpConnectionExceptionCode,
    { userFriendlyMessage }: { userFriendlyMessage?: MessageDescriptor } = {},
  ) {
    super(message, code, {
      userFriendlyMessage:
        userFriendlyMessage ??
        getMcpConnectionExceptionUserFriendlyMessage(code),
    });
  }
}
