import { useMutation, useQuery } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Tag } from 'twenty-ui/data-display';
import { SearchInput, Toggle } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { OverflowingTextWithTooltip } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';
import { useDebouncedCallback } from 'use-debounce';

import { useApolloAdminClient } from '@/settings/admin-panel/apollo/hooks/useApolloAdminClient';
import { SettingsSectionSkeletonLoader } from '@/settings/components/SettingsSectionSkeletonLoader';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import {
  GlobalCompanyDirectoryEntriesDocument,
  SetGlobalCompanyQuarantinedDocument,
} from '~/generated-admin/graphql';

const DIRECTORY_PAGE_SIZE = 50;

const DIRECTORY_GRID_TEMPLATE_COLUMNS = '2fr 0.6fr 1.4fr 1.2fr 1fr 0.8fr';

const StyledSearchContainer = styled.div`
  margin-bottom: ${themeCssVariables.spacing[4]};
`;

const StyledEmptyState = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  padding: ${themeCssVariables.spacing[4]} 0;
`;

const StyledSources = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledFooter = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding-top: ${themeCssVariables.spacing[3]};
`;

// Operator-only view of the shared company directory: inspect entries and
// quarantine bad ones so they are no longer served to campaigns.
export const SettingsAdminCompanyDirectory = () => {
  const { t } = useLingui();
  const apolloAdminClient = useApolloAdminClient();
  const { enqueueErrorSnackBar } = useSnackBar();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const debounceSearch = useDebouncedCallback(setDebouncedSearchQuery, 300);

  const { data, loading, refetch } = useQuery(
    GlobalCompanyDirectoryEntriesDocument,
    {
      client: apolloAdminClient,
      fetchPolicy: 'network-only',
      variables: {
        input: {
          search: debouncedSearchQuery,
          offset: 0,
          limit: DIRECTORY_PAGE_SIZE,
        },
      },
    },
  );

  const [setGlobalCompanyQuarantined] = useMutation(
    SetGlobalCompanyQuarantinedDocument,
    { client: apolloAdminClient },
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debounceSearch(value);
  };

  const handleQuarantineChange = async (
    globalCompanyId: string,
    isQuarantined: boolean,
  ) => {
    try {
      await setGlobalCompanyQuarantined({
        variables: { input: { globalCompanyId, isQuarantined } },
      });
      await refetch();
    } catch {
      enqueueErrorSnackBar({ message: t`Could not update the entry` });
    }
  };

  const entries = data?.globalCompanyDirectoryEntries.entries ?? [];
  const totalCount = data?.globalCompanyDirectoryEntries.totalCount ?? 0;

  return (
    <Section>
      <H2Title
        title={t`Company directory`}
        description={t`Public company facts shared across workspaces. Tenants never see this list; quarantined entries are no longer used by campaigns.`}
      />
      <StyledSearchContainer>
        <SearchInput
          placeholder={t`Search by name, domain, LEI or registration number`}
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </StyledSearchContainer>
      {loading && !isDefined(data) ? (
        <SettingsSectionSkeletonLoader />
      ) : entries.length === 0 ? (
        <StyledEmptyState>{t`No directory entries yet.`}</StyledEmptyState>
      ) : (
        <>
          <Table>
            <TableRow gridTemplateColumns={DIRECTORY_GRID_TEMPLATE_COLUMNS}>
              <TableHeader>{t`Company`}</TableHeader>
              <TableHeader>{t`Country`}</TableHeader>
              <TableHeader>{t`Identifier`}</TableHeader>
              <TableHeader>{t`Sources`}</TableHeader>
              <TableHeader>{t`Verified`}</TableHeader>
              <TableHeader>{t`Quarantined`}</TableHeader>
            </TableRow>
            <TableBody>
              {entries.map((entry) => (
                <TableRow
                  key={entry.id}
                  gridTemplateColumns={DIRECTORY_GRID_TEMPLATE_COLUMNS}
                >
                  <TableCell overflow="hidden">
                    <OverflowingTextWithTooltip
                      text={
                        isDefined(entry.canonicalDomain)
                          ? `${entry.name} (${entry.canonicalDomain})`
                          : entry.name
                      }
                    />
                  </TableCell>
                  <TableCell>{entry.countryCode ?? '—'}</TableCell>
                  <TableCell overflow="hidden">
                    <OverflowingTextWithTooltip
                      text={
                        entry.lei ??
                        (isDefined(entry.registrationNumber)
                          ? `${entry.registrationAuthority ?? ''} ${entry.registrationNumber}`
                          : '—')
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <StyledSources>
                      {entry.sourceProviderIds.map((sourceProviderId) => (
                        <Tag
                          key={sourceProviderId}
                          color="gray"
                          text={sourceProviderId}
                        />
                      ))}
                    </StyledSources>
                  </TableCell>
                  <TableCell>
                    {new Date(entry.lastVerifiedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Toggle
                      value={entry.isQuarantined}
                      onChange={(isQuarantined) =>
                        handleQuarantineChange(entry.id, isQuarantined)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <StyledFooter>
            {t`Showing ${entries.length} of ${totalCount} entries`}
          </StyledFooter>
        </>
      )}
    </Section>
  );
};
