import { gql } from '@apollo/client';

export const IMPORT_PROSPECT_CANDIDATES = gql`
  mutation ImportProspectCandidates($input: ImportProspectCandidatesInput!) {
    importProspectCandidates(input: $input) {
      campaignId
      createdCount
      mergedCount
      candidatesFound
    }
  }
`;
