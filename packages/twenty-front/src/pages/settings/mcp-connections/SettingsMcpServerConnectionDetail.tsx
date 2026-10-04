import { useParams } from 'react-router-dom';

import { SettingsMcpServerConnectionForm } from '@/settings/mcp-connections/components/SettingsMcpServerConnectionForm';
import { McpServerConnectionFormMode } from '@/settings/mcp-connections/constants/McpServerConnectionFormMode';

export const SettingsMcpServerConnectionDetail = () => {
  const { mcpServerConnectionId } = useParams();

  return (
    <SettingsMcpServerConnectionForm
      mode={McpServerConnectionFormMode.Edit}
      mcpServerConnectionId={mcpServerConnectionId}
    />
  );
};
