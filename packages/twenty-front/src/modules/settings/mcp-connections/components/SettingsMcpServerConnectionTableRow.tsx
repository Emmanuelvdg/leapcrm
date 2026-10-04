import { styled } from '@linaria/react';

import { MCP_SERVER_CONNECTION_TABLE_ROW_GRID_TEMPLATE_COLUMNS } from '@/settings/mcp-connections/constants/McpServerConnectionTableRowGridTemplateColumns';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useLingui } from '@lingui/react/macro';
import { IconChevronRight } from 'twenty-ui/icon';
import { Status } from 'twenty-ui/data-display';
import { OverflowingTextWithTooltip } from 'twenty-ui/surfaces';
import { useContext } from 'react';
import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';
import {
  McpServerConnectionStatus,
  type McpServerConnection,
} from '~/generated-metadata/graphql';

const StyledIconChevronRightContainer = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
`;

export const SettingsMcpServerConnectionTableRow = ({
  mcpServerConnection,
  to,
}: {
  mcpServerConnection: Pick<
    McpServerConnection,
    'id' | 'name' | 'serverUrl' | 'status'
  >;
  to: string;
}) => {
  const { theme } = useContext(ThemeContext);
  const { t } = useLingui();

  const statusDisplay = {
    [McpServerConnectionStatus.CONNECTED]: {
      color: 'green' as const,
      text: t`Connected`,
    },
    [McpServerConnectionStatus.PENDING]: {
      color: 'yellow' as const,
      text: t`Not connected`,
    },
    [McpServerConnectionStatus.ERROR]: {
      color: 'red' as const,
      text: t`Error`,
    },
  }[mcpServerConnection.status];

  return (
    <TableRow
      gridTemplateColumns={
        MCP_SERVER_CONNECTION_TABLE_ROW_GRID_TEMPLATE_COLUMNS
      }
      to={to}
    >
      <TableCell color={themeCssVariables.font.color.primary} overflow="hidden">
        <OverflowingTextWithTooltip text={mcpServerConnection.name} />
      </TableCell>
      <TableCell clickable>
        <Status color={statusDisplay.color} text={statusDisplay.text} />
      </TableCell>
      <TableCell
        align="center"
        padding={`0 ${themeCssVariables.spacing[1]} 0 0`}
      >
        <StyledIconChevronRightContainer>
          <IconChevronRight
            size={theme.icon.size.md}
            stroke={theme.icon.stroke.sm}
          />
        </StyledIconChevronRightContainer>
      </TableCell>
    </TableRow>
  );
};
