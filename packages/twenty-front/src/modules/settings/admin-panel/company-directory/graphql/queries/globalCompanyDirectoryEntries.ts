import { gql } from '@apollo/client';

export const GLOBAL_COMPANY_DIRECTORY_ENTRIES = gql`
  query GlobalCompanyDirectoryEntries(
    $input: GlobalCompanyDirectoryEntriesInput!
  ) {
    globalCompanyDirectoryEntries(input: $input) {
      totalCount
      entries {
        id
        name
        countryCode
        canonicalDomain
        lei
        registrationAuthority
        registrationNumber
        industry
        employeeCount
        sourceProviderIds
        isQuarantined
        lastVerifiedAt
      }
    }
  }
`;
