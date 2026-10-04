import { registerEnumType } from '@nestjs/graphql';

export enum McpServerConnectionAuthMethod {
  OAUTH = 'OAUTH',
  API_KEY = 'API_KEY',
}

registerEnumType(McpServerConnectionAuthMethod, {
  name: 'McpServerConnectionAuthMethod',
  description: 'How a workspace authenticates to an external MCP server',
});
