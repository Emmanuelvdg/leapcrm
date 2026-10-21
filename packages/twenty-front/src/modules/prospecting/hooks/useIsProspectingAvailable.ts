import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import {
  FeatureFlagKey,
  PermissionFlagType,
} from '~/generated-metadata/graphql';

export const useIsProspectingAvailable = () => {
  const isProspectingEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_PROSPECTING_ENABLED,
  );
  const hasProspectingPermission = useHasPermissionFlag(
    PermissionFlagType.PROSPECTING,
  );

  return isProspectingEnabled && hasProspectingPermission;
};
