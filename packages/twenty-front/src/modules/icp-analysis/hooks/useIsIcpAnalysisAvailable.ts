import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import {
  FeatureFlagKey,
  PermissionFlagType,
} from '~/generated-metadata/graphql';

export const useIsIcpAnalysisAvailable = () => {
  const isIcpAnalysisEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_ICP_ANALYSIS_ENABLED,
  );
  const hasIcpAnalysisPermission = useHasPermissionFlag(
    PermissionFlagType.ICP_ANALYSIS,
  );

  return isIcpAnalysisEnabled && hasIcpAnalysisPermission;
};
