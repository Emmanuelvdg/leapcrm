import gql from 'graphql-tag';
import { API_CONNECTION_FRAGMENT } from '@/settings/api-connections/graphql/fragments/apiConnectionFragment';

export const TEST_API_CONNECTION = gql`
  mutation TestApiConnection($id: UUID!) {
    testApiConnection(id: $id) {
      success
      httpStatus
      durationMs
      responsePreview
      errorMessage
      connection {
        ...ApiConnectionFragment
      }
    }
  }
  ${API_CONNECTION_FRAGMENT}
`;
