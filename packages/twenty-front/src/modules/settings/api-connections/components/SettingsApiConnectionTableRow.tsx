import { styled } from '@linaria/react';

import { SettingsApiConnectionStatus } from '@/settings/api-connections/components/SettingsApiConnectionStatus';
import { API_CONNECTION_TABLE_ROW_GRID_TEMPLATE_COLUMNS } from '@/settings/api-connections/constants/ApiConnectionTableRowGridTemplateColumns';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useContext } from 'react';
import { IconChevronRight } from 'twenty-ui/icon';
import { OverflowingTextWithTooltip } from 'twenty-ui/surfaces';
import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';
import { type ApiConnection } from '~/generated-metadata/graphql';

const StyledIconChevronRightContainer = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
`;

type SettingsApiConnectionTableRowProps = {
  apiConnection: Pick<ApiConnection, 'id' | 'name' | 'status'>;
  to: string;
};

export const SettingsApiConnectionTableRow = ({
  apiConnection,
  to,
}: SettingsApiConnectionTableRowProps) => {
  const { theme } = useContext(ThemeContext);

  return (
    <TableRow
      gridTemplateColumns={API_CONNECTION_TABLE_ROW_GRID_TEMPLATE_COLUMNS}
      to={to}
    >
      <TableCell color={themeCssVariables.font.color.primary} overflow="hidden">
        <OverflowingTextWithTooltip text={apiConnection.name} />
      </TableCell>
      <TableCell clickable>
        <SettingsApiConnectionStatus status={apiConnection.status} />
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
