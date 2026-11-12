import { registerEnumType } from '@nestjs/graphql';

export enum ApiConnectionStatus {
  PENDING = 'PENDING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

registerEnumType(ApiConnectionStatus, {
  name: 'ApiConnectionStatus',
  description: 'Connection status of an external REST API',
});
