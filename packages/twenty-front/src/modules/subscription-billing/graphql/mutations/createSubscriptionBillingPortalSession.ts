import { gql } from '@apollo/client';

export const CREATE_SUBSCRIPTION_BILLING_PORTAL_SESSION = gql`
  mutation CreateSubscriptionBillingPortalSession {
    createSubscriptionBillingPortalSession {
      url
    }
  }
`;
