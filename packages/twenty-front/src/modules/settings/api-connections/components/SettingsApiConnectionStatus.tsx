import { useLingui } from '@lingui/react/macro';
import { Status } from 'twenty-ui/data-display';
import { ApiConnectionStatus } from '~/generated-metadata/graphql';

type SettingsApiConnectionStatusProps = {
  status: ApiConnectionStatus;
};

export const SettingsApiConnectionStatus = ({
  status,
}: SettingsApiConnectionStatusProps) => {
  const { t } = useLingui();

  const statusDisplay = {
    [ApiConnectionStatus.CONNECTED]: {
      color: 'green' as const,
      text: t`Connected`,
    },
    [ApiConnectionStatus.PENDING]: {
      color: 'yellow' as const,
      text: t`Not tested`,
    },
    [ApiConnectionStatus.ERROR]: { color: 'red' as const, text: t`Error` },
  }[status];

  return <Status color={statusDisplay.color} text={statusDisplay.text} />;
};
