import { gql } from '@apollo/client';

export const ICP_MODEL_EVIDENCE = gql`
  query IcpModelEvidence($input: IcpModelIdInput!) {
    icpModelEvidence(input: $input) {
      modelId
      attributes
      rows
    }
  }
`;
