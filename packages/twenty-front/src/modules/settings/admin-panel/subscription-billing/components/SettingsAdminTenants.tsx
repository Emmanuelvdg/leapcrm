import { useApolloAdminClient } from '@/settings/admin-panel/apollo/hooks/useApolloAdminClient';
import { SettingsSectionSkeletonLoader } from '@/settings/components/SettingsSectionSkeletonLoader';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useQuery } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Tag } from 'twenty-ui/data-display';
import { Section } from 'twenty-ui/layout';
import { OverflowingTextWithTooltip } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';

import { AdminTenantsOverviewDocument } from '~/generated-admin/graphql';

const StyledEmptyState = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  padding: ${themeCssVariables.spacing[4]} 0;
`;

const TENANTS_GRID_TEMPLATE_COLUMNS = '2fr 1fr 1fr 1fr 1fr';

const STATUS_TAG_COLOR: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  ACTIVE: 'green',
  TRIALING: 'yellow',
  PAST_DUE: 'red',
  CANCELED: 'gray',
  INCOMPLETE: 'gray',
};

export const SettingsAdminTenants = () => {
  const { t } = useLingui();
  const apolloAdminClient = useApolloAdminClient();

  const { data, loading } = useQuery(AdminTenantsOverviewDocument, {
    client: apolloAdminClient,
    fetchPolicy: 'network-only',
  });

  const tenants = data?.adminTenantsOverview ?? [];

  const totalMrrCents = tenants.reduce(
    (sum, tenant) => sum + (tenant.estimatedMrrCents ?? 0),
    0,
  );

  return (
    <Section>
      <H2Title
        title={t`Tenants`}
        description={t`Every workspace on this instance, with subscription status, seats, and estimated MRR. Total estimated MRR: ${(totalMrrCents / 100).toFixed(2)} USD.`}
      />
      {loading ? (
        <SettingsSectionSkeletonLoader />
      ) : tenants.length === 0 ? (
        <StyledEmptyState>{t`No workspaces found.`}</StyledEmptyState>
      ) : (
        <Table>
          <TableRow gridTemplateColumns={TENANTS_GRID_TEMPLATE_COLUMNS}>
            <TableHeader>{t`Workspace`}</TableHeader>
            <TableHeader>{t`Status`}</TableHeader>
            <TableHeader>{t`Seats`}</TableHeader>
            <TableHeader>{t`Est. MRR`}</TableHeader>
            <TableHeader>{t`Created`}</TableHeader>
          </TableRow>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow
                key={tenant.workspaceId}
                gridTemplateColumns={TENANTS_GRID_TEMPLATE_COLUMNS}
              >
                <TableCell overflow="hidden">
                  <OverflowingTextWithTooltip
                    text={
                      tenant.displayName ??
                      tenant.subdomain ??
                      tenant.workspaceId
                    }
                  />
                </TableCell>
                <TableCell>
                  {tenant.isGrandfathered ? (
                    <Tag color="blue" text={t`Grandfathered`} />
                  ) : tenant.subscriptionStatus ? (
                    <Tag
                      color={
                        STATUS_TAG_COLOR[tenant.subscriptionStatus] ?? 'gray'
                      }
                      text={tenant.subscriptionStatus}
                    />
                  ) : (
                    <Tag color="gray" text={t`No subscription`} />
                  )}
                </TableCell>
                <TableCell>
                  {tenant.activeMembers} / {tenant.seats}
                </TableCell>
                <TableCell>
                  {tenant.estimatedMrrCents !== null
                    ? `${(tenant.estimatedMrrCents / 100).toFixed(2)} USD`
                    : '—'}
                </TableCell>
                <TableCell>
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
};
