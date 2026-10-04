import gql from 'graphql-tag';
import { MCP_SERVER_CONNECTION_FRAGMENT } from '@/settings/mcp-connections/graphql/fragments/mcpServerConnectionFragment';

export const GET_MCP_SERVER_CONNECTIONS = gql`
  query GetMcpServerConnections {
    mcpServerConnections {
      ...McpServerConnectionFragment
    }
  }
  ${MCP_SERVER_CONNECTION_FRAGMENT}
`;
