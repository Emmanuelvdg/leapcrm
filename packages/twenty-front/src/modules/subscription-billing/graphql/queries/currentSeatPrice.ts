import { gql } from '@apollo/client';

export const CURRENT_SEAT_PRICE = gql`
  query CurrentSeatPrice {
    currentSeatPrice {
      unitAmountCents
      currency
      interval
      firstPeriodUnitAmountCents
      isSyncedWithStripe
    }
  }
`;
