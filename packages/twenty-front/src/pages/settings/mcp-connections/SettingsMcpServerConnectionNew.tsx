import { SettingsMcpServerConnectionForm } from '@/settings/mcp-connections/components/SettingsMcpServerConnectionForm';
import { McpServerConnectionFormMode } from '@/settings/mcp-connections/constants/McpServerConnectionFormMode';

export const SettingsMcpServerConnectionNew = () => {
  return (
    <SettingsMcpServerConnectionForm
      mode={McpServerConnectionFormMode.Create}
    />
  );
};
