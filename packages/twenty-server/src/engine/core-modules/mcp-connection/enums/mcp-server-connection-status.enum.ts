import { registerEnumType } from '@nestjs/graphql';

export enum McpServerConnectionStatus {
  PENDING = 'PENDING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

registerEnumType(McpServerConnectionStatus, {
  name: 'McpServerConnectionStatus',
  description: 'Connection status of an external MCP server',
});
