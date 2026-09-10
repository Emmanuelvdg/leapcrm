import { gql } from '@apollo/client';

export const ADD_WORKSPACE_AI_PROVIDER = gql`
  mutation AddWorkspaceAiProvider($input: AddWorkspaceAiProviderInput!) {
    addWorkspaceAiProvider(input: $input) {
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
