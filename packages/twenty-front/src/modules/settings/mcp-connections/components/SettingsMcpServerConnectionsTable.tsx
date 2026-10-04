import { styled } from '@linaria/react';

import { MCP_SERVER_CONNECTION_TABLE_ROW_GRID_TEMPLATE_COLUMNS } from '@/settings/mcp-connections/constants/McpServerConnectionTableRowGridTemplateColumns';
import { SettingsMcpServerConnectionTableRow } from '@/settings/mcp-connections/components/SettingsMcpServerConnectionTableRow';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useQuery } from '@apollo/client/react';
import { GetMcpServerConnectionsDocument } from '~/generated-metadata/graphql';

const StyledTableBodyContainer = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  max-height: 260px;
  overflow-y: auto;
`;

export const SettingsMcpServerConnectionsTable = () => {
  const { t } = useLingui();
  const { data } = useQuery(GetMcpServerConnectionsDocument);

  const mcpServerConnections = data?.mcpServerConnections;

  return (
    <Table>
      <TableRow
        gridTemplateColumns={
          MCP_SERVER_CONNECTION_TABLE_ROW_GRID_TEMPLATE_COLUMNS
        }
      >
        <TableHeader>{t`Name`}</TableHeader>
        <TableHeader>{t`Status`}</TableHeader>
        <TableHeader></TableHeader>
      </TableRow>
      {!!mcpServerConnections?.length && (
        <StyledTableBodyContainer>
          <TableBody>
            {mcpServerConnections.map((mcpServerConnection) => (
              <SettingsMcpServerConnectionTableRow
                key={mcpServerConnection.id}
                mcpServerConnection={mcpServerConnection}
                to={getSettingsPath(SettingsPath.McpServerConnectionDetail, {
                  mcpServerConnectionId: mcpServerConnection.id,
                })}
              />
            ))}
          </TableBody>
        </StyledTableBodyContainer>
      )}
    </Table>
  );
};
