import { gql } from '@apollo/client';

export const SET_GLOBAL_COMPANY_QUARANTINED = gql`
  mutation SetGlobalCompanyQuarantined(
    $input: SetGlobalCompanyQuarantinedInput!
  ) {
    setGlobalCompanyQuarantined(input: $input)
  }
`;
