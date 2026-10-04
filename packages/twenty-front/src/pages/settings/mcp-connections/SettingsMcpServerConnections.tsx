import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { SettingsMcpServerConnectionsTable } from '@/settings/mcp-connections/components/SettingsMcpServerConnectionsTable';
import { useIsMobile } from '@/ui/utilities/responsive/hooks/useIsMobile';
import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { IconPlus } from 'twenty-ui/icon';
import { H2Title } from 'twenty-ui/typography';
import { Button } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { MOBILE_VIEWPORT, themeCssVariables } from 'twenty-ui/theme-constants';

const StyledButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: ${themeCssVariables.spacing[2]};
  @media (max-width: ${MOBILE_VIEWPORT}px) {
    padding-top: ${themeCssVariables.spacing[5]};
  }
`;

const StyledContainer = styled.div<{ isMobile: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  overflow: hidden;
`;

export const SettingsMcpServerConnections = () => {
  const isMobile = useIsMobile();
  const { t } = useLingui();

  return (
    <SettingsPageLayout
      title={t`Integrations`}
      links={[
        {
          children: <Trans>Workspace</Trans>,
          href: getSettingsPath(SettingsPath.General),
        },
        { children: <Trans>Integrations</Trans> },
      ]}
    >
      <SettingsPageContainer>
        <StyledContainer isMobile={isMobile}>
          <Section>
            <H2Title
              title={t`MCP Servers`}
              description={t`Connect external MCP servers to make their tools available in chat and workflows.`}
            />
            <SettingsMcpServerConnectionsTable />
            <StyledButtonContainer>
              <Button
                Icon={IconPlus}
                title={t`Connect MCP Server`}
                size="small"
                variant="secondary"
                to={getSettingsPath(SettingsPath.NewMcpServerConnection)}
              />
            </StyledButtonContainer>
          </Section>
        </StyledContainer>
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
