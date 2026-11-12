import gql from 'graphql-tag';

export const GET_API_CONNECTIONS = gql`
  query GetApiConnections {
    apiConnections {
      id
      name
      baseUrl
      status
    }
  }
`;
