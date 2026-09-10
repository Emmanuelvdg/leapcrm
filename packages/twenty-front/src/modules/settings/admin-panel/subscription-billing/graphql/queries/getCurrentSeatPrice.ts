import { gql } from '@apollo/client';

export const GET_CURRENT_SEAT_PRICE = gql`
  query GetCurrentSeatPrice {
    getCurrentSeatPrice {
      unitAmountCents
      currency
      interval
      isSyncedWithStripe
    }
  }
`;
