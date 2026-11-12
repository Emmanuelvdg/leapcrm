import { registerEnumType } from '@nestjs/graphql';

export enum ApiConnectionAuthType {
  BEARER = 'BEARER',
  API_KEY_HEADER = 'API_KEY_HEADER',
  NONE = 'NONE',
}

registerEnumType(ApiConnectionAuthType, {
  name: 'ApiConnectionAuthType',
  description: 'How a workspace authenticates to an external REST API',
});
