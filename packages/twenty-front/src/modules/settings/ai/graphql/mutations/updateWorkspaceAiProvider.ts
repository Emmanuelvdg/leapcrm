import { gql } from '@apollo/client';

export const UPDATE_WORKSPACE_AI_PROVIDER = gql`
  mutation UpdateWorkspaceAiProvider($input: UpdateWorkspaceAiProviderInput!) {
    updateWorkspaceAiProvider(input: $input) {
      id
      providerName
      npm
      label
      baseUrl
      hasApiKey
      models
      createdAt
      updatedAt
    }
  }
`;
