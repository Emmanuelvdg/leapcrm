import gql from 'graphql-tag';
import { MCP_SERVER_CONNECTION_FRAGMENT } from '@/settings/mcp-connections/graphql/fragments/mcpServerConnectionFragment';

export const GET_MCP_SERVER_CONNECTION = gql`
  query GetMcpServerConnection($id: UUID!) {
    mcpServerConnection(id: $id) {
      ...McpServerConnectionFragment
    }
  }
  ${MCP_SERVER_CONNECTION_FRAGMENT}
`;
