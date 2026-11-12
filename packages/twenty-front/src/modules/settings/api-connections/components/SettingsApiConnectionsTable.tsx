import { styled } from '@linaria/react';

import { SettingsApiConnectionTableRow } from '@/settings/api-connections/components/SettingsApiConnectionTableRow';
import { API_CONNECTION_TABLE_ROW_GRID_TEMPLATE_COLUMNS } from '@/settings/api-connections/constants/ApiConnectionTableRowGridTemplateColumns';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useQuery } from '@apollo/client/react';
import { useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { GetApiConnectionsDocument } from '~/generated-metadata/graphql';

const StyledTableBodyContainer = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  max-height: 260px;
  overflow-y: auto;
`;

export const SettingsApiConnectionsTable = () => {
  const { t } = useLingui();
  const { data } = useQuery(GetApiConnectionsDocument);

  const apiConnections = data?.apiConnections;

  return (
    <Table>
      <TableRow
        gridTemplateColumns={API_CONNECTION_TABLE_ROW_GRID_TEMPLATE_COLUMNS}
      >
        <TableHeader>{t`Name`}</TableHeader>
        <TableHeader>{t`Status`}</TableHeader>
        <TableHeader></TableHeader>
      </TableRow>
      {!!apiConnections?.length && (
        <StyledTableBodyContainer>
          <TableBody>
            {apiConnections.map((apiConnection) => (
              <SettingsApiConnectionTableRow
                key={apiConnection.id}
                apiConnection={apiConnection}
                to={getSettingsPath(SettingsPath.ApiConnectionDetail, {
                  apiConnectionId: apiConnection.id,
                })}
              />
            ))}
          </TableBody>
        </StyledTableBodyContainer>
      )}
    </Table>
  );
};
