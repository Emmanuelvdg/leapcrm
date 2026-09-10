import { gql } from '@apollo/client';

export const ADMIN_TENANTS_OVERVIEW = gql`
  query AdminTenantsOverview {
    adminTenantsOverview {
      workspaceId
      displayName
      subdomain
      createdAt
      subscriptionStatus
      seats
      activeMembers
      trialEnd
      currentPeriodEnd
      isGrandfathered
      estimatedMrrCents
    }
  }
`;
