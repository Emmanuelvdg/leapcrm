import gql from 'graphql-tag';
import { API_CONNECTION_FRAGMENT } from '@/settings/api-connections/graphql/fragments/apiConnectionFragment';

export const UPDATE_API_CONNECTION = gql`
  mutation UpdateApiConnection($input: UpdateApiConnectionInput!) {
    updateApiConnection(input: $input) {
      ...ApiConnectionFragment
    }
  }
  ${API_CONNECTION_FRAGMENT}
`;
