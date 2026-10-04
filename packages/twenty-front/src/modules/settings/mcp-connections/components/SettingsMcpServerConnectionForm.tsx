import { Controller, FormProvider } from 'react-hook-form';

import { SaveAndCancelButtons } from '@/settings/components/SaveAndCancelButtons/SaveAndCancelButtons';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsSkeletonLoader } from '@/settings/components/SettingsSkeletonLoader';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { type McpServerConnectionFormMode } from '@/settings/mcp-connections/constants/McpServerConnectionFormMode';
import { useMcpServerConnectionForm } from '@/settings/mcp-connections/hooks/useMcpServerConnectionForm';
import { useTriggerMcpServerConnectionOAuth } from '@/settings/mcp-connections/hooks/useTriggerMcpServerConnectionOAuth';
import { Select } from '@/ui/input/components/Select';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { ConfirmationModal } from '@/ui/layout/modal/components/ConfirmationModal';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { Trans, useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath, isDefined } from 'twenty-shared/utils';
import { AdvancedSettingsToggle, Button } from 'twenty-ui/input';
import { IconTrash, IconPlug } from 'twenty-ui/icon';
import { H2Title } from 'twenty-ui/typography';
import { Section } from 'twenty-ui/layout';
import { Status } from 'twenty-ui/data-display';
import {
  McpServerConnectionAuthMethod,
  McpServerConnectionStatus,
} from '~/generated-metadata/graphql';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';

const DELETE_MCP_SERVER_CONNECTION_MODAL_ID =
  'delete-mcp-server-connection-modal';

type SettingsMcpServerConnectionFormProps = {
  mcpServerConnectionId?: string;
  mode: McpServerConnectionFormMode;
};

export const SettingsMcpServerConnectionForm = ({
  mcpServerConnectionId,
  mode,
}: SettingsMcpServerConnectionFormProps) => {
  const { t } = useLingui();
  const navigate = useNavigateSettings();
  const { openModal } = useModal();
  const { triggerMcpServerConnectionOAuth } =
    useTriggerMcpServerConnectionOAuth();
  const {
    formConfig,
    loading,
    canSave,
    handleSave,
    handleDelete,
    isCreationMode,
    error,
    mcpServerConnection,
  } = useMcpServerConnectionForm({ mcpServerConnectionId, mode });

  if ((loading && !isCreationMode) || isDefined(error)) {
    return <SettingsSkeletonLoader />;
  }

  const title = isCreationMode
    ? t`New MCP Server Connection`
    : (formConfig.watch('name') ?? t`MCP Server Connection`);

  const useManualOverrides = formConfig.watch('useManualOverrides');
  const authMethod = formConfig.watch('authMethod');
  const isApiKeyAuth = authMethod === McpServerConnectionAuthMethod.API_KEY;
  const apiKeyTextInputId = `${mcpServerConnectionId}-api-key`;

  const nameTextInputId = `${mcpServerConnectionId}-name`;
  const serverUrlTextInputId = `${mcpServerConnectionId}-server-url`;
  const authorizationEndpointTextInputId = `${mcpServerConnectionId}-authorization-endpoint`;
  const tokenEndpointTextInputId = `${mcpServerConnectionId}-token-endpoint`;
  const clientIdTextInputId = `${mcpServerConnectionId}-client-id`;
  const clientSecretTextInputId = `${mcpServerConnectionId}-client-secret`;

  return (
    // oxlint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...formConfig}>
      <SettingsPageLayout
        title={title}
        links={[
          {
            children: t`Workspace`,
            href: getSettingsPath(SettingsPath.General),
          },
          {
            children: t`Integrations`,
            href: getSettingsPath(SettingsPath.Integrations),
          },
          { children: isCreationMode ? t`New` : title },
        ]}
        actionButton={
          <SaveAndCancelButtons
            isSaveDisabled={!canSave}
            isCancelDisabled={formConfig.formState.isSubmitting}
            onCancel={() => navigate(SettingsPath.Integrations)}
            onSave={formConfig.handleSubmit(handleSave)}
          />
        }
      >
        <SettingsPageContainer>
          {!isCreationMode && isDefined(mcpServerConnection) && (
            <Section>
              <H2Title
                title={t`Connection`}
                description={t`Authorize this workspace to call tools on the remote MCP server.`}
              />
              {mcpServerConnection.status ===
              McpServerConnectionStatus.CONNECTED ? (
                <Status color="green" text={t`Connected`} />
              ) : (
                <Status
                  color={
                    mcpServerConnection.status ===
                    McpServerConnectionStatus.ERROR
                      ? 'red'
                      : 'yellow'
                  }
                  text={
                    mcpServerConnection.status ===
                    McpServerConnectionStatus.ERROR
                      ? (mcpServerConnection.lastErrorMessage ?? t`Error`)
                      : t`Not connected`
                  }
                />
              )}
              {mcpServerConnection.authMethod ===
                McpServerConnectionAuthMethod.OAUTH && (
                <Button
                  Icon={IconPlug}
                  title={
                    mcpServerConnection.status ===
                    McpServerConnectionStatus.CONNECTED
                      ? t`Reconnect`
                      : t`Connect`
                  }
                  size="small"
                  variant="secondary"
                  onClick={() =>
                    triggerMcpServerConnectionOAuth({
                      connectionId: mcpServerConnection.id,
                    })
                  }
                />
              )}
            </Section>
          )}
          <Section>
            <H2Title
              title={t`Name`}
              description={t`A label to help you recognize this connection`}
            />
            <Controller
              name="name"
              control={formConfig.control}
              render={({
                field: { onChange, value },
                fieldState: { error },
              }) => (
                <SettingsTextInput
                  instanceId={nameTextInputId}
                  placeholder={t`e.g. Disburse`}
                  value={value}
                  onChange={onChange}
                  error={error?.message}
                  fullWidth
                  autoFocus={isCreationMode}
                />
              )}
            />
          </Section>
          <Section>
            <H2Title
              title={t`Server URL`}
              description={t`The MCP server's base URL`}
            />
            <Controller
              name="serverUrl"
              control={formConfig.control}
              render={({
                field: { onChange, value },
                fieldState: { error },
              }) => (
                <SettingsTextInput
                  instanceId={serverUrlTextInputId}
                  placeholder={t`https://example.com/mcp`}
                  value={value}
                  onChange={onChange}
                  error={error?.message}
                  fullWidth
                  disabled={!isCreationMode}
                />
              )}
            />
          </Section>
          {isCreationMode && (
            <Section>
              <H2Title
                title={t`Authentication`}
                description={t`How this workspace signs in to the MCP server`}
              />
              <Controller
                name="authMethod"
                control={formConfig.control}
                render={({ field: { onChange, value } }) => (
                  <Select
                    dropdownId="mcp-server-connection-auth-method"
                    options={[
                      {
                        label: t`OAuth (sign in on the server)`,
                        value: 'OAUTH',
                      },
                      { label: t`API key`, value: 'API_KEY' },
                    ]}
                    value={value}
                    onChange={onChange}
                    fullWidth
                  />
                )}
              />
            </Section>
          )}
          {isApiKeyAuth && (
            <Section>
              <H2Title
                title={isCreationMode ? t`API key` : t`Replace API key`}
                description={
                  isCreationMode
                    ? t`Sent to the server as a Bearer token. It is stored encrypted and never shown again.`
                    : t`Leave empty to keep the current key.`
                }
              />
              <Controller
                name="apiKey"
                control={formConfig.control}
                render={({ field: { onChange, value } }) => (
                  <SettingsTextInput
                    instanceId={apiKeyTextInputId}
                    type="password"
                    placeholder={
                      isCreationMode ? t`Paste your API key` : t`New API key`
                    }
                    value={value || ''}
                    onChange={onChange}
                    fullWidth
                  />
                )}
              />
            </Section>
          )}
          {isCreationMode && !isApiKeyAuth && (
            <Section>
              <AdvancedSettingsToggle
                isAdvancedModeEnabled={useManualOverrides}
                setIsAdvancedModeEnabled={(enabled) =>
                  formConfig.setValue('useManualOverrides', enabled, {
                    shouldDirty: true,
                  })
                }
                label={t`Manually configure OAuth endpoints`}
              />
              {useManualOverrides && (
                <>
                  <Controller
                    name="authorizationEndpoint"
                    control={formConfig.control}
                    render={({ field: { onChange, value } }) => (
                      <SettingsTextInput
                        instanceId={authorizationEndpointTextInputId}
                        placeholder={t`Authorization endpoint`}
                        value={value || ''}
                        onChange={onChange}
                        fullWidth
                      />
                    )}
                  />
                  <Controller
                    name="tokenEndpoint"
                    control={formConfig.control}
                    render={({ field: { onChange, value } }) => (
                      <SettingsTextInput
                        instanceId={tokenEndpointTextInputId}
                        placeholder={t`Token endpoint`}
                        value={value || ''}
                        onChange={onChange}
                        fullWidth
                      />
                    )}
                  />
                  <Controller
                    name="clientId"
                    control={formConfig.control}
                    render={({ field: { onChange, value } }) => (
                      <SettingsTextInput
                        instanceId={clientIdTextInputId}
                        placeholder={t`Client ID`}
                        value={value || ''}
                        onChange={onChange}
                        fullWidth
                      />
                    )}
                  />
                  <Controller
                    name="clientSecret"
                    control={formConfig.control}
                    render={({ field: { onChange, value } }) => (
                      <SettingsTextInput
                        instanceId={clientSecretTextInputId}
                        placeholder={t`Client secret (optional)`}
                        value={value || ''}
                        onChange={onChange}
                        fullWidth
                      />
                    )}
                  />
                </>
              )}
            </Section>
          )}
          {!isCreationMode && (
            <Section>
              <H2Title
                title={t`Danger zone`}
                description={t`Delete this MCP server connection`}
              />
              <Button
                accent="danger"
                variant="secondary"
                title={t`Delete`}
                Icon={IconTrash}
                onClick={() => openModal(DELETE_MCP_SERVER_CONNECTION_MODAL_ID)}
              />
            </Section>
          )}
        </SettingsPageContainer>
      </SettingsPageLayout>
      {!isCreationMode && (
        <ConfirmationModal
          confirmationPlaceholder={t`yes`}
          confirmationValue={t`yes`}
          modalInstanceId={DELETE_MCP_SERVER_CONNECTION_MODAL_ID}
          title={t`Delete MCP server connection`}
          subtitle={
            <Trans>
              Please type "yes" to confirm you want to delete this connection.
              Its tools will no longer be available to chat or workflows.
            </Trans>
          }
          onConfirmClick={handleDelete}
          confirmButtonText={t`Delete`}
        />
      )}
    </FormProvider>
  );
};
