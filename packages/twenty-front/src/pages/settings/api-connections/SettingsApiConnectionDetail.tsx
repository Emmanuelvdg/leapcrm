import { useParams } from 'react-router-dom';

import { SettingsApiConnectionForm } from '@/settings/api-connections/components/SettingsApiConnectionForm';

export const SettingsApiConnectionDetail = () => {
  const { apiConnectionId } = useParams();

  return (
    <SettingsApiConnectionForm
      key={apiConnectionId}
      apiConnectionId={apiConnectionId}
      isCreationMode={false}
    />
  );
};
