import { registerEnumType } from '@nestjs/graphql';

export enum WorkspaceSubscriptionStatus {
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE',
}

registerEnumType(WorkspaceSubscriptionStatus, {
  name: 'WorkspaceSubscriptionStatus',
});
