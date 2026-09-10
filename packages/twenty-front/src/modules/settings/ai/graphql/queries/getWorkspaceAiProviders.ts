import { gql } from '@apollo/client';

export const GET_WORKSPACE_AI_PROVIDERS = gql`
  query GetWorkspaceAiProviders {
    getWorkspaceAiProviders {
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
