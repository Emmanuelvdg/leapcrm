import { gql } from '@apollo/client';

export const ANALYZE_ICP_MODEL = gql`
  mutation AnalyzeIcpModel($input: IcpModelIdInput!) {
    analyzeIcpModel(input: $input) {
      modelId
      analysis
      rows
    }
  }
`;

export const SUGGEST_ICP_MODEL_CRITERIA = gql`
  mutation SuggestIcpModelCriteria($input: IcpModelIdInput!) {
    suggestIcpModelCriteria(input: $input) {
      modelId
      criteria
    }
  }
`;

export const DUPLICATE_ICP_MODEL = gql`
  mutation DuplicateIcpModel($input: IcpModelIdInput!) {
    duplicateIcpModel(input: $input) {
      modelId
      version
    }
  }
`;
