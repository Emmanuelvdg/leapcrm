import { gql } from '@apollo/client';

export const REMOVE_WORKSPACE_AI_PROVIDER = gql`
  mutation RemoveWorkspaceAiProvider($id: String!) {
    removeWorkspaceAiProvider(id: $id)
  }
`;
