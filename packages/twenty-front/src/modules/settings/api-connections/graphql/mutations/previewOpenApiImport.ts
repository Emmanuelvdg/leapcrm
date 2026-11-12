import gql from 'graphql-tag';

export const PREVIEW_OPEN_API_IMPORT = gql`
  mutation PreviewOpenApiImport($input: PreviewOpenApiImportInput!) {
    previewOpenApiImport(input: $input) {
      operations
      skipped
      suggestedBaseUrl
    }
  }
`;
