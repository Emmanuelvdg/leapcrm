import { gql } from '@apollo/client';

export const DENY_APP_AUTHORIZATION = gql`
  mutation denyAppAuthorization(
    $clientId: String!
    $redirectUrl: String!
    $state: String
  ) {
    denyAppAuthorization(
      clientId: $clientId
      redirectUrl: $redirectUrl
      state: $state
    ) {
      redirectUrl
    }
  }
`;
