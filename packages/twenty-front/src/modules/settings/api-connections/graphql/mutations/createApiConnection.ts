import gql from 'graphql-tag';
import { API_CONNECTION_FRAGMENT } from '@/settings/api-connections/graphql/fragments/apiConnectionFragment';

export const CREATE_API_CONNECTION = gql`
  mutation CreateApiConnection($input: CreateApiConnectionInput!) {
    createApiConnection(input: $input) {
      ...ApiConnectionFragment
    }
  }
  ${API_CONNECTION_FRAGMENT}
`;
