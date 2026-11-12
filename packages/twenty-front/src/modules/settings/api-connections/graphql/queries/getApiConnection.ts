import gql from 'graphql-tag';
import { API_CONNECTION_FRAGMENT } from '@/settings/api-connections/graphql/fragments/apiConnectionFragment';

export const GET_API_CONNECTION = gql`
  query GetApiConnection($id: UUID!) {
    apiConnection(id: $id) {
      ...ApiConnectionFragment
    }
  }
  ${API_CONNECTION_FRAGMENT}
`;
