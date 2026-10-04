import gql from 'graphql-tag';

export const GET_CONNECTED_MCP_SERVER_CONNECTIONS = gql`
  query GetConnectedMcpServerConnections {
    connectedMcpServerConnections {
      id
      name
    }
  }
`;
