import gql from 'graphql-tag';
import { MCP_SERVER_CONNECTION_FRAGMENT } from '@/settings/mcp-connections/graphql/fragments/mcpServerConnectionFragment';

export const UPDATE_MCP_SERVER_CONNECTION = gql`
  mutation UpdateMcpServerConnection($input: UpdateMcpServerConnectionInput!) {
    updateMcpServerConnection(input: $input) {
      ...McpServerConnectionFragment
    }
  }
  ${MCP_SERVER_CONNECTION_FRAGMENT}
`;
