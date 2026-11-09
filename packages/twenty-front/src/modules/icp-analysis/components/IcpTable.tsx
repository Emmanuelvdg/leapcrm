import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export const StyledIcpTable = styled.table`
  border-collapse: collapse;
  font-size: ${themeCssVariables.font.size.sm};
  width: 100%;
`;

export const StyledIcpHeaderCell = styled.th<{ align?: 'left' | 'right' }>`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.tertiary};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: ${themeCssVariables.spacing[1]};
  text-align: ${({ align }) => align ?? 'left'};
  white-space: nowrap;
`;

export const StyledIcpCell = styled.td<{ align?: 'left' | 'right' }>`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  padding: ${themeCssVariables.spacing[1]};
  text-align: ${({ align }) => align ?? 'left'};
  vertical-align: middle;
`;
