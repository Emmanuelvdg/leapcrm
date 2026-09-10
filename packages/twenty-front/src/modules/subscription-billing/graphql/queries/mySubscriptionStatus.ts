import { gql } from '@apollo/client';

export const MY_SUBSCRIPTION_STATUS = gql`
  query MySubscriptionStatus {
    mySubscriptionStatus {
      status
      isLocked
      trialEnd
      currentPeriodEnd
      seats
      activeMembers
    }
  }
`;
