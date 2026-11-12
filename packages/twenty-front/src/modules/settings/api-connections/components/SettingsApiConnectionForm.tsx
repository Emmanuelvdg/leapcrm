import { useState } from 'react';
import { Controller, FormProvider } from 'react-hook-form';

import { SettingsApiConnectionDefaultHeaders } from '@/settings/api-connections/components/SettingsApiConnectionDefaultHeaders';
import { SettingsApiConnectionOperationsSection } from '@/settings/api-connections/components/SettingsApiConnectionOperationsSection';
import { SettingsApiConnectionStatus } from '@/settings/api-connections/components/SettingsApiConnectionStatus';
import {
  type ApiConnectionTestResultView,
  SettingsApiConnectionTestResult,
} from '@/settings/api-connections/components/SettingsApiConnectionTestResult';
import { API_CONNECTION_TEMPLATES } from '@/settings/api-connections/constants/ApiConnectionTemplates';
import {
  DEFAULT_API_CONNECTION_FORM_VALUES,
  useApiConnectionForm,
} from '@/settings/api-connections/hooks/useApiConnectionForm';
import { SaveAndCancelButtons } from '@/settings/components/SaveAndCancelButtons/SaveAndCancelButtons';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsSkeletonLoader } from '@/settings/components/SettingsSkeletonLoader';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { Select } from '@/ui/input/components/Select';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { TextArea } from '@/ui/input/components/TextArea';
import { ConfirmationModal } from '@/ui/layout/modal/components/ConfirmationModal';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath, isDefined } from 'twenty-shared/utils';
import { IconPlayerPlay, IconTrash } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';
import { TestApiConnectionDocument } from '~/generated-metadata/graphql';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';

const DELETE_API_CONNECTION_MODAL_ID = 'delete-api-connection-modal';
const BLANK_TEMPLATE_ID = 'blank';

const StyledStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledStatusRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
`;

const StyledHint = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

type SettingsApiConnectionFormProps = {
  apiConnectionId?: string;
  isCreationMode: boolean;
};

export const SettingsApiConnectionForm = ({
  apiConnectionId,
  isCreationMode,
}: SettingsApiConnectionFormProps) => {
  const { t } = useLingui();
  const navigate = useNavigateSettings();
  const { openModal } = useModal();
  const { enqueueErrorSnackBar } = useSnackBar();
  const [templateId, setTemplateId] = useState(BLANK_TEMPLATE_ID);
  const [testResult, setTestResult] =
    useState<ApiConnectionTestResultView | null>(null);

  const {
    formConfig,
    loading,
    error,
    canSave,
    handleSave,
    handleDelete,
    apiConnection,
  } = useApiConnectionForm({ apiConnectionId, isCreationMode });

  const [testApiConnection, { loading: isTesting }] = useMutation(
    TestApiConnectionDocument,
  );

  if ((loading && !isCreationMode) || isDefined(error)) {
    return <SettingsSkeletonLoader />;
  }

  const instanceId = apiConnectionId ?? 'new-api-connection';
  const name = formConfig.watch('name');
  const authType = formConfig.watch('authType');
  const operations = formConfig.watch('operations');
  const openApiSpecUrl = formConfig.watch('openApiSpecUrl');
  const isDirty = formConfig.formState.isDirty;

  const title = isCreationMode
    ? t`New API connection`
    : isNonEmptyString(name)
      ? name
      : t`API connection`;

  const handleTemplateChange = (nextTemplateId: string) => {
    setTemplateId(nextTemplateId);

    const template = API_CONNECTION_TEMPLATES.find(
      (candidate) => candidate.id === nextTemplateId,
    );

    formConfig.reset({
      ...(isDefined(template)
        ? { ...template.values, secret: '' }
        : DEFAULT_API_CONNECTION_FORM_VALUES),
      secret: formConfig.getValues('secret'),
    });
  };

  const handleTest = async () => {
    if (!isDefined(apiConnectionId)) {
      return;
    }

    try {
      const { data } = await testApiConnection({
        variables: { id: apiConnectionId },
      });

      if (isDefined(data?.testApiConnection)) {
        setTestResult(data.testApiConnection);
      }
    } catch (mutationError) {
      enqueueErrorSnackBar({
        apolloError: CombinedGraphQLErrors.is(mutationError)
          ? mutationError
          : undefined,
      });
    }
  };

  const testOperationOptions = [
    { label: t`None`, value: '' },
    ...operations.map((operation) => ({
      label: `${operation.method} ${operation.path} (${operation.name})`,
      value: operation.name,
    })),
  ];

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
          { children: isCreationMode ? t`New API` : title },
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
          {isCreationMode && (
            <Section>
              <H2Title
                title={t`Start from`}
                description={t`Prefill the connection for a known API, then add your own key.`}
              />
              <Select
                dropdownId={`${instanceId}-template`}
                options={[
                  { label: t`Blank`, value: BLANK_TEMPLATE_ID },
                  ...API_CONNECTION_TEMPLATES.map((template) => ({
                    label: template.label,
                    value: template.id,
                  })),
                ]}
                value={templateId}
                onChange={handleTemplateChange}
                fullWidth
              />
            </Section>
          )}
          {!isCreationMode && isDefined(apiConnection) && (
            <Section>
              <H2Title
                title={t`Connection`}
                description={t`Runs the test operation with the saved settings.`}
              />
              <StyledStack>
                <StyledStatusRow>
                  <SettingsApiConnectionStatus status={apiConnection.status} />
                  <Button
                    Icon={IconPlayerPlay}
                    title={isTesting ? t`Testing...` : t`Test connection`}
                    size="small"
                    variant="secondary"
                    disabled={isTesting || isDirty}
                    onClick={handleTest}
                  />
                </StyledStatusRow>
                {isDirty && (
                  <StyledHint>{t`Save your changes before testing.`}</StyledHint>
                )}
                {isDefined(testResult) ? (
                  <SettingsApiConnectionTestResult result={testResult} />
                ) : (
                  isDefined(apiConnection.lastErrorMessage) && (
                    <SettingsApiConnectionTestResult
                      result={{
                        success: false,
                        errorMessage: apiConnection.lastErrorMessage,
                      }}
                    />
                  )
                )}
              </StyledStack>
            </Section>
          )}
          <Section>
            <H2Title
              title={t`Name`}
              description={t`Shown in settings, workflows and to the AI`}
            />
            <Controller
              name="name"
              control={formConfig.control}
              render={({ field: { onChange, value }, fieldState }) => (
                <SettingsTextInput
                  instanceId={`${instanceId}-name`}
                  placeholder={t`e.g. GetLeads`}
                  value={value}
                  onChange={onChange}
                  error={fieldState.error?.message}
                  fullWidth
                />
              )}
            />
          </Section>
          <Section>
            <H2Title
              title={t`Base URL`}
              description={t`Every operation path is appended to this URL, and calls can never leave it`}
            />
            <Controller
              name="baseUrl"
              control={formConfig.control}
              render={({ field: { onChange, value }, fieldState }) => (
                <SettingsTextInput
                  instanceId={`${instanceId}-base-url`}
                  placeholder={t`https://api.example.com/v1`}
                  value={value}
                  onChange={onChange}
                  error={fieldState.error?.message}
                  fullWidth
                />
              )}
            />
          </Section>
          <Section>
            <H2Title
              title={t`Authentication`}
              description={t`The key is stored encrypted and never shown again`}
            />
            <StyledStack>
              <Controller
                name="authType"
                control={formConfig.control}
                render={({ field: { onChange, value } }) => (
                  <Select
                    dropdownId={`${instanceId}-auth-type`}
                    options={[
                      {
                        label: t`Bearer token (Authorization header)`,
                        value: 'BEARER',
                      },
                      {
                        label: t`API key in a custom header`,
                        value: 'API_KEY_HEADER',
                      },
                      { label: t`No authentication`, value: 'NONE' },
                    ]}
                    value={value}
                    onChange={onChange}
                    fullWidth
                  />
                )}
              />
              {authType === 'API_KEY_HEADER' && (
                <Controller
                  name="authHeaderName"
                  control={formConfig.control}
                  render={({ field: { onChange, value }, fieldState }) => (
                    <SettingsTextInput
                      instanceId={`${instanceId}-auth-header-name`}
                      placeholder={t`Header name, e.g. X-API-Key`}
                      value={value}
                      onChange={onChange}
                      error={fieldState.error?.message}
                      fullWidth
                    />
                  )}
                />
              )}
              {authType !== 'NONE' && (
                <Controller
                  name="secret"
                  control={formConfig.control}
                  render={({ field: { onChange, value } }) => (
                    <SettingsTextInput
                      instanceId={`${instanceId}-secret`}
                      type="password"
                      placeholder={
                        isCreationMode || apiConnection?.hasSecret !== true
                          ? t`Paste your API key`
                          : t`A key is saved. Enter a new key to replace it.`
                      }
                      value={value}
                      onChange={onChange}
                      fullWidth
                    />
                  )}
                />
              )}
            </StyledStack>
          </Section>
          <Section>
            <H2Title
              title={t`Default headers`}
              description={t`Sent with every call. Do not put keys here; use the API key field.`}
            />
            <Controller
              name="defaultHeaders"
              control={formConfig.control}
              render={({ field: { onChange, value } }) => (
                <SettingsApiConnectionDefaultHeaders
                  instanceId={instanceId}
                  headers={value}
                  onChange={onChange}
                />
              )}
            />
          </Section>
          <SettingsApiConnectionOperationsSection
            instanceId={instanceId}
            operations={operations}
            openApiSpecUrl={openApiSpecUrl}
            onOperationsChange={(nextOperations) =>
              formConfig.setValue('operations', nextOperations, {
                shouldDirty: true,
              })
            }
            onOpenApiImported={({ specUrl, suggestedBaseUrl }) => {
              if (isDefined(specUrl)) {
                formConfig.setValue('openApiSpecUrl', specUrl, {
                  shouldDirty: true,
                });
              }

              if (
                isDefined(suggestedBaseUrl) &&
                !isNonEmptyString(formConfig.getValues('baseUrl'))
              ) {
                formConfig.setValue('baseUrl', suggestedBaseUrl, {
                  shouldDirty: true,
                });
              }
            }}
          />
          <Section>
            <H2Title
              title={t`Test call`}
              description={t`Runs on save and from Test connection. Pick a free, read-only operation: some APIs charge per call.`}
            />
            <StyledStack>
              <Controller
                name="testOperationName"
                control={formConfig.control}
                render={({ field: { onChange, value } }) => (
                  <Select
                    dropdownId={`${instanceId}-test-operation`}
                    options={testOperationOptions}
                    value={value}
                    onChange={onChange}
                    fullWidth
                  />
                )}
              />
              <Controller
                name="testArguments"
                control={formConfig.control}
                render={({ field: { onChange, value }, fieldState }) => (
                  <>
                    <TextArea
                      textAreaId={`${instanceId}-test-arguments`}
                      label={t`Test arguments (JSON object)`}
                      placeholder={'{ "company_size_min": 1 }'}
                      minRows={3}
                      value={value}
                      onChange={onChange}
                    />
                    {isDefined(fieldState.error) && (
                      <StyledHint>{fieldState.error.message}</StyledHint>
                    )}
                  </>
                )}
              />
            </StyledStack>
          </Section>
          {!isCreationMode && (
            <Section>
              <H2Title
                title={t`Danger zone`}
                description={t`Delete this API connection`}
              />
              <Button
                accent="danger"
                variant="secondary"
                title={t`Delete`}
                Icon={IconTrash}
                onClick={() => openModal(DELETE_API_CONNECTION_MODAL_ID)}
              />
            </Section>
          )}
        </SettingsPageContainer>
      </SettingsPageLayout>
      {!isCreationMode && (
        <ConfirmationModal
          confirmationPlaceholder={t`yes`}
          confirmationValue={t`yes`}
          modalInstanceId={DELETE_API_CONNECTION_MODAL_ID}
          title={t`Delete API connection`}
          subtitle={
            <Trans>
              Please type "yes" to confirm you want to delete this connection.
              Its operations will no longer be available to chat or workflows.
            </Trans>
          }
          onConfirmClick={handleDelete}
          confirmButtonText={t`Delete`}
        />
      )}
    </FormProvider>
  );
};
