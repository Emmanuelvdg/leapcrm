import { gql } from '@apollo/client';

export const UPDATE_SEAT_PRICE = gql`
  mutation UpdateSeatPrice($input: UpdateSeatPriceInput!) {
    updateSeatPrice(input: $input) {
      unitAmountCents
      currency
      interval
      isSyncedWithStripe
    }
  }
`;
