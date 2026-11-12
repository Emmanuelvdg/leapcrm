import gql from 'graphql-tag';

export const GET_CONNECTED_API_CONNECTIONS = gql`
  query GetConnectedApiConnections {
    connectedApiConnections {
      id
      name
    }
  }
`;
