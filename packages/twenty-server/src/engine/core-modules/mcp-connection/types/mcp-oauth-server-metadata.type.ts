export type McpOAuthServerMetadata = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint: string | null;
  scopesSupported: string[] | null;
};
