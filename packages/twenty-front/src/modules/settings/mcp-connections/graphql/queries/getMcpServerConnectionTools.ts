import gql from 'graphql-tag';

export const GET_MCP_SERVER_CONNECTION_TOOLS = gql`
  query GetMcpServerConnectionTools($connectionId: UUID!) {
    mcpServerConnectionTools(connectionId: $connectionId) {
      name
      description
      inputSchema
    }
  }
`;
