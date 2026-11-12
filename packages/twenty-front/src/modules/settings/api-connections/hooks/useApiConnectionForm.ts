import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { useSnackBarOnQueryError } from '@/apollo/hooks/useSnackBarOnQueryError';
import { buildApiConnectionInput } from '@/settings/api-connections/utils/buildApiConnectionInput';
import { toApiConnectionFormValues } from '@/settings/api-connections/utils/toApiConnectionFormValues';
import {
  apiConnectionFormSchema,
  type ApiConnectionFormValues,
} from '@/settings/api-connections/validation-schemas/apiConnectionFormSchema';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation, useQuery } from '@apollo/client/react';
import { t } from '@lingui/core/macro';
import { SettingsPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import {
  CreateApiConnectionDocument,
  DeleteApiConnectionDocument,
  GetApiConnectionDocument,
  GetApiConnectionsDocument,
  UpdateApiConnectionDocument,
} from '~/generated-metadata/graphql';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';

type UseApiConnectionFormProps = {
  apiConnectionId?: string;
  isCreationMode: boolean;
};

export const DEFAULT_API_CONNECTION_FORM_VALUES: ApiConnectionFormValues = {
  name: '',
  baseUrl: '',
  authType: 'BEARER',
  authHeaderName: '',
  secret: '',
  defaultHeaders: [],
  operations: [],
  testOperationName: '',
  testArguments: '',
  openApiSpecUrl: '',
};

export const useApiConnectionForm = ({
  apiConnectionId,
  isCreationMode,
}: UseApiConnectionFormProps) => {
  const navigate = useNavigateSettings();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const [createApiConnection] = useMutation(CreateApiConnectionDocument, {
    refetchQueries: [GetApiConnectionsDocument],
  });
  const [updateApiConnection] = useMutation(UpdateApiConnectionDocument);
  const [deleteApiConnection] = useMutation(DeleteApiConnectionDocument, {
    refetchQueries: [GetApiConnectionsDocument],
  });

  const formConfig = useForm<ApiConnectionFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(apiConnectionFormSchema),
    defaultValues: DEFAULT_API_CONNECTION_FORM_VALUES,
  });

  const { loading, error, data } = useQuery(GetApiConnectionDocument, {
    skip: isCreationMode || !isDefined(apiConnectionId),
    variables: { id: apiConnectionId ?? '' },
  });

  const apiConnection = data?.apiConnection;

  useEffect(() => {
    if (isDefined(apiConnection)) {
      formConfig.reset(toApiConnectionFormValues(apiConnection));
    }
  }, [apiConnection, formConfig]);

  useSnackBarOnQueryError(error, t`Failed to load API connection`);

  const { isDirty, isSubmitting } = formConfig.formState;
  const watchedAuthType = formConfig.watch('authType');
  const watchedSecret = formConfig.watch('secret');
  const isSecretMissingOnCreate =
    isCreationMode && watchedAuthType !== 'NONE' && watchedSecret.trim() === '';
  const canSave = isCreationMode
    ? !isSubmitting && !isSecretMissingOnCreate
    : isDirty && !isSubmitting;

  const handleCreate = async (formValues: ApiConnectionFormValues) => {
    try {
      const { data: createData } = await createApiConnection({
        variables: { input: buildApiConnectionInput(formValues) },
      });
      const created = createData?.createApiConnection;

      enqueueSuccessSnackBar({
        message: t`API connection "${formValues.name}" created`,
      });

      if (isDefined(created)) {
        navigate(SettingsPath.ApiConnectionDetail, {
          apiConnectionId: created.id,
        });
      } else {
        navigate(SettingsPath.Integrations);
      }
    } catch (mutationError) {
      enqueueErrorSnackBar({
        apolloError: CombinedGraphQLErrors.is(mutationError)
          ? mutationError
          : undefined,
      });
    }
  };

  const handleUpdate = async (formValues: ApiConnectionFormValues) => {
    if (!isDefined(apiConnectionId)) {
      return;
    }

    try {
      const { data: updateData } = await updateApiConnection({
        variables: {
          input: {
            id: apiConnectionId,
            ...buildApiConnectionInput(formValues),
          },
        },
      });

      const updated = updateData?.updateApiConnection;

      formConfig.reset(
        isDefined(updated)
          ? toApiConnectionFormValues(updated)
          : { ...formValues, secret: '' },
      );

      enqueueSuccessSnackBar({ message: t`API connection updated` });
    } catch (mutationError) {
      enqueueErrorSnackBar({
        apolloError: CombinedGraphQLErrors.is(mutationError)
          ? mutationError
          : undefined,
      });
    }
  };

  const handleDelete = async () => {
    if (!isDefined(apiConnectionId)) {
      return;
    }

    try {
      await deleteApiConnection({ variables: { id: apiConnectionId } });

      enqueueSuccessSnackBar({ message: t`API connection deleted` });
      navigate(SettingsPath.Integrations);
    } catch (mutationError) {
      enqueueErrorSnackBar({
        apolloError: CombinedGraphQLErrors.is(mutationError)
          ? mutationError
          : undefined,
      });
    }
  };

  return {
    formConfig,
    loading,
    error,
    canSave,
    handleSave: isCreationMode ? handleCreate : handleUpdate,
    handleDelete,
    apiConnection,
  };
};
