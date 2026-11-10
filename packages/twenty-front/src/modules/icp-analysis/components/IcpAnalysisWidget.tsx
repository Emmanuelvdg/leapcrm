import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { IcpAnalysisWidgetContent } from '@/icp-analysis/components/IcpAnalysisWidgetContent';
import { StyledIcpEmpty } from '@/icp-analysis/components/IcpStat';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import {
  FeatureFlagKey,
  PermissionFlagType,
} from '~/generated-metadata/graphql';

const StyledUnavailable = styled.div`
  box-sizing: border-box;
  padding: ${themeCssVariables.spacing[3]};
  width: 100%;
`;

// A model record stays reachable by URL when the flag is off or the role
// lacks the permission, and the server refuses every action then.
export const IcpAnalysisWidget = () => {
  const { t } = useLingui();
  const isIcpAnalysisEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_ICP_ANALYSIS_ENABLED,
  );
  const hasIcpAnalysisPermission = useHasPermissionFlag(
    PermissionFlagType.ICP_ANALYSIS,
  );

  if (!isIcpAnalysisEnabled) {
    return (
      <StyledUnavailable>
        <StyledIcpEmpty>
          {t`ICP analysis is not turned on for this workspace.`}
        </StyledIcpEmpty>
      </StyledUnavailable>
    );
  }

  if (!hasIcpAnalysisPermission) {
    return (
      <StyledUnavailable>
        <StyledIcpEmpty>
          {t`Your role does not include ICP analysis. Ask a workspace admin for access.`}
        </StyledIcpEmpty>
      </StyledUnavailable>
    );
  }

  return <IcpAnalysisWidgetContent />;
};
