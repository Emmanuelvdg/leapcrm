import gql from 'graphql-tag';

export const DELETE_API_CONNECTION = gql`
  mutation DeleteApiConnection($id: UUID!) {
    deleteApiConnection(id: $id) {
      id
    }
  }
`;
