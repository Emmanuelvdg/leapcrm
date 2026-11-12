import gql from 'graphql-tag';

export const GET_API_CONNECTION_OPERATION_TOOLS = gql`
  query GetApiConnectionOperationTools($connectionId: UUID!) {
    apiConnectionOperationTools(connectionId: $connectionId) {
      name
      description
      method
      path
      inputSchema
    }
  }
`;
