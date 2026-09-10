import { gql } from '@apollo/client';

export const CREATE_SUBSCRIPTION_CHECKOUT_SESSION = gql`
  mutation CreateSubscriptionCheckoutSession(
    $input: CreateCheckoutSessionInput!
  ) {
    createSubscriptionCheckoutSession(input: $input) {
      url
    }
  }
`;
