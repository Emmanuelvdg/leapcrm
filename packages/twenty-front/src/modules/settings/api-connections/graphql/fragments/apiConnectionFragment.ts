import gql from 'graphql-tag';

export const API_CONNECTION_FRAGMENT = gql`
  fragment ApiConnectionFragment on ApiConnection {
    id
    name
    baseUrl
    authType
    authHeaderName
    hasSecret
    defaultHeaders
    operations
    testOperationName
    testArguments
    openApiSpecUrl
    status
    lastErrorMessage
    lastTestedAt
    createdAt
    updatedAt
  }
`;
