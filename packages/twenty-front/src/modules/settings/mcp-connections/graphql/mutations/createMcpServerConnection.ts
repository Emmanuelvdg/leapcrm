import gql from 'graphql-tag';
import { MCP_SERVER_CONNECTION_FRAGMENT } from '@/settings/mcp-connections/graphql/fragments/mcpServerConnectionFragment';

export const CREATE_MCP_SERVER_CONNECTION = gql`
  mutation CreateMcpServerConnection($input: CreateMcpServerConnectionInput!) {
    createMcpServerConnection(input: $input) {
      ...McpServerConnectionFragment
    }
  }
  ${MCP_SERVER_CONNECTION_FRAGMENT}
`;
