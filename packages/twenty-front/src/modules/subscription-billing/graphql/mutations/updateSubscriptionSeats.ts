import { gql } from '@apollo/client';

export const UPDATE_SUBSCRIPTION_SEATS = gql`
  mutation UpdateSubscriptionSeats($input: UpdateSubscriptionSeatsInput!) {
    updateSubscriptionSeats(input: $input) {
      status
      isLocked
      trialEnd
      currentPeriodEnd
      seats
      activeMembers
    }
  }
`;
