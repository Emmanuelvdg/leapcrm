import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { McpServerConnectionFormMode } from '@/settings/mcp-connections/constants/McpServerConnectionFormMode';
import {
  mcpServerConnectionFormSchema,
  type McpServerConnectionFormValues,
} from '@/settings/mcp-connections/validation-schemas/mcpServerConnectionFormSchema';
import { useSnackBarOnQueryError } from '@/apollo/hooks/useSnackBarOnQueryError';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation, useQuery } from '@apollo/client/react';
import { t } from '@lingui/core/macro';
import { SettingsPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import {
  CreateMcpServerConnectionDocument,
  DeleteMcpServerConnectionDocument,
  GetMcpServerConnectionDocument,
  GetMcpServerConnectionsDocument,
  UpdateMcpServerConnectionDocument,
} from '~/generated-metadata/graphql';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';

type UseMcpServerConnectionFormProps = {
  mcpServerConnectionId?: string;
  mode: McpServerConnectionFormMode;
};

const DEFAULT_FORM_VALUES: McpServerConnectionFormValues = {
  name: '',
  serverUrl: '',
  authMethod: 'OAUTH',
  apiKey: '',
  useManualOverrides: false,
  authorizationEndpoint: '',
  tokenEndpoint: '',
  clientId: '',
  clientSecret: '',
};

export const useMcpServerConnectionForm = ({
  mcpServerConnectionId,
  mode,
}: UseMcpServerConnectionFormProps) => {
  const navigate = useNavigateSettings();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const isCreationMode = mode === McpServerConnectionFormMode.Create;

  const [createMcpServerConnection] = useMutation(
    CreateMcpServerConnectionDocument,
    { refetchQueries: [GetMcpServerConnectionsDocument] },
  );
  const [updateMcpServerConnection] = useMutation(
    UpdateMcpServerConnectionDocument,
  );
  const [deleteMcpServerConnection] = useMutation(
    DeleteMcpServerConnectionDocument,
    { refetchQueries: [GetMcpServerConnectionsDocument] },
  );

  const formConfig = useForm<McpServerConnectionFormValues>({
    mode: isCreationMode ? 'onSubmit' : 'onTouched',
    resolver: zodResolver(mcpServerConnectionFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const {
    loading,
    error,
    data: mcpServerConnectionData,
  } = useQuery(GetMcpServerConnectionDocument, {
    skip: isCreationMode || !mcpServerConnectionId,
    variables: { id: mcpServerConnectionId || '' },
  });

  useEffect(() => {
    const mcpServerConnection = mcpServerConnectionData?.mcpServerConnection;

    if (!isDefined(mcpServerConnection)) {
      return;
    }

    formConfig.reset({
      name: mcpServerConnection.name,
      serverUrl: mcpServerConnection.serverUrl,
      authMethod: mcpServerConnection.authMethod,
      apiKey: '',
      useManualOverrides: mcpServerConnection.usesManualOverrides,
      authorizationEndpoint: '',
      tokenEndpoint: '',
      clientId: '',
      clientSecret: '',
    });
  }, [mcpServerConnectionData, formConfig]);

  useSnackBarOnQueryError(error, t`Failed to load MCP server connection`);

  const { isDirty, isValid, isSubmitting } = formConfig.formState;
  const watchedAuthMethod = formConfig.watch('authMethod');
  const watchedApiKey = formConfig.watch('apiKey');
  const isApiKeyMissingOnCreate =
    isCreationMode &&
    watchedAuthMethod === 'API_KEY' &&
    !isDefined(watchedApiKey?.trim() || undefined);
  const canSave = isCreationMode
    ? isValid && !isSubmitting && !isApiKeyMissingOnCreate
    : isDirty && isValid && !isSubmitting;

  const buildManualOverrides = (formValues: McpServerConnectionFormValues) =>
    formValues.useManualOverrides
      ? {
          authorizationEndpoint: formValues.authorizationEndpoint || '',
          tokenEndpoint: formValues.tokenEndpoint || '',
          clientId: formValues.clientId || '',
          clientSecret: formValues.clientSecret || undefined,
        }
      : undefined;

  const handleCreate = async (formValues: McpServerConnectionFormValues) => {
    try {
      const { data } = await createMcpServerConnection({
        variables: {
          input: {
            name: formValues.name,
            serverUrl: formValues.serverUrl,
            ...(formValues.authMethod === 'API_KEY'
              ? { apiKey: formValues.apiKey }
              : { manualOverrides: buildManualOverrides(formValues) }),
          },
        },
      });
      const createdConnection = data?.createMcpServerConnection;

      enqueueSuccessSnackBar({
        message: t`MCP server connection "${formValues.name}" created successfully`,
      });

      if (isDefined(createdConnection)) {
        navigate(SettingsPath.McpServerConnectionDetail, {
          mcpServerConnectionId: createdConnection.id,
        });
      } else {
        navigate(SettingsPath.Integrations);
      }
    } catch (error) {
      enqueueErrorSnackBar({
        apolloError: CombinedGraphQLErrors.is(error) ? error : undefined,
      });
    }
  };

  const handleUpdate = async (formValues: McpServerConnectionFormValues) => {
    if (!mcpServerConnectionId) {
      enqueueErrorSnackBar({
        message: t`MCP server connection ID is required for updates`,
      });
      return;
    }

    try {
      await updateMcpServerConnection({
        variables: {
          input: {
            id: mcpServerConnectionId,
            name: formValues.name,
            serverUrl: formValues.serverUrl,
            ...(formValues.authMethod === 'API_KEY' &&
            isDefined(formValues.apiKey) &&
            formValues.apiKey !== ''
              ? { apiKey: formValues.apiKey }
              : {}),
          },
        },
      });

      formConfig.reset({ ...formValues, apiKey: '' });

      enqueueSuccessSnackBar({
        message: t`MCP server connection updated successfully`,
      });
    } catch (error) {
      enqueueErrorSnackBar({
        apolloError: CombinedGraphQLErrors.is(error) ? error : undefined,
      });
    }
  };

  const handleSave = isCreationMode ? handleCreate : handleUpdate;

  const handleDelete = async () => {
    if (!mcpServerConnectionId) {
      enqueueErrorSnackBar({
        message: t`MCP server connection ID is required for deletion`,
      });
      return;
    }

    try {
      await deleteMcpServerConnection({
        variables: { id: mcpServerConnectionId },
      });

      enqueueSuccessSnackBar({
        message: t`MCP server connection deleted successfully`,
      });

      navigate(SettingsPath.Integrations);
    } catch (error) {
      enqueueErrorSnackBar({
        apolloError: CombinedGraphQLErrors.is(error) ? error : undefined,
      });
    }
  };

  return {
    formConfig,
    loading,
    canSave,
    handleSave,
    handleDelete,
    isCreationMode,
    error,
    mcpServerConnection: mcpServerConnectionData?.mcpServerConnection,
  };
};
