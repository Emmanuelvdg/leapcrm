import { FormRawJsonFieldInput } from '@/object-record/record-field/ui/form-types/components/FormRawJsonFieldInput';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { Select } from '@/ui/input/components/Select';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { type WorkflowApiConnectionCallAction } from '@/workflow/types/Workflow';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepFooter } from '@/workflow/workflow-steps/components/WorkflowStepFooter';
import { JSON_RESPONSE_PLACEHOLDER } from '@/workflow/workflow-steps/workflow-actions/http-request-action/constants/HttpRequest';
import { useHttpRequestOutputSchema } from '@/workflow/workflow-steps/workflow-actions/http-request-action/hooks/useHttpRequestOutputSchema';
import { type JsonSchemaArgumentField } from '@/workflow/workflow-steps/workflow-actions/types/JsonSchemaArgumentField';
import { coerceJsonSchemaArgumentValue } from '@/workflow/workflow-steps/workflow-actions/utils/coerceJsonSchemaArgumentValue';
import { getJsonSchemaArgumentFields } from '@/workflow/workflow-steps/workflow-actions/utils/getJsonSchemaArgumentFields';
import { WorkflowVariablePicker } from '@/workflow/workflow-variables/components/WorkflowVariablePicker';
import { useQuery } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useDebouncedCallback } from 'use-debounce';
import {
  GetApiConnectionOperationToolsDocument,
  GetConnectedApiConnectionsDocument,
} from '~/generated-metadata/graphql';

type WorkflowEditActionApiConnectionCallProps = {
  action: WorkflowApiConnectionCallAction;
  actionOptions: {
    readonly?: boolean;
    onActionUpdate?: (action: WorkflowApiConnectionCallAction) => void;
  };
};

type ApiConnectionCallFormData =
  WorkflowApiConnectionCallAction['settings']['input'];

const StyledContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
`;

const StyledHelperText = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledOperationDescription = styled.div`
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  color: ${themeCssVariables.font.color.tertiary};
  display: -webkit-box;
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
`;

const formatArgumentValue = (value: unknown): string | undefined => {
  if (!isDefined(value)) {
    return undefined;
  }

  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
};

export const WorkflowEditActionApiConnectionCall = ({
  action,
  actionOptions,
}: WorkflowEditActionApiConnectionCallProps) => {
  const { t } = useLingui();
  const isReadonly = actionOptions.readonly === true;

  const [formData, setFormData] = useState<ApiConnectionCallFormData>({
    connectionId: action.settings.input.connectionId ?? null,
    operationName: action.settings.input.operationName ?? null,
    arguments: action.settings.input.arguments ?? {},
  });

  const { data: connectionsData, loading: isLoadingConnections } = useQuery(
    GetConnectedApiConnectionsDocument,
  );

  const {
    data: operationsData,
    loading: isLoadingOperations,
    error: operationsError,
  } = useQuery(GetApiConnectionOperationToolsDocument, {
    variables: { connectionId: formData.connectionId ?? '' },
    skip: !isDefined(formData.connectionId),
  });

  const { outputSchema, handleOutputSchemaChange, error } =
    useHttpRequestOutputSchema({
      action,
      onActionUpdate: actionOptions.onActionUpdate,
      readonly: isReadonly,
    });

  const saveAction = useDebouncedCallback(
    (nextFormData: ApiConnectionCallFormData) => {
      if (isReadonly) {
        return;
      }

      actionOptions.onActionUpdate?.({
        ...action,
        settings: {
          ...action.settings,
          input: nextFormData,
        },
      });
    },
    500,
  );

  useEffect(() => () => saveAction.flush(), [saveAction]);

  const updateFormData = (nextFormData: ApiConnectionCallFormData) => {
    setFormData(nextFormData);
    saveAction(nextFormData);
  };

  const connections = connectionsData?.connectedApiConnections ?? [];
  const operations = operationsData?.apiConnectionOperationTools ?? [];
  const selectedOperation = operations.find(
    (operation) => operation.name === formData.operationName,
  );
  const argumentFields = getJsonSchemaArgumentFields(
    selectedOperation?.inputSchema,
  );

  const handleConnectionChange = (connectionId: string | null) => {
    updateFormData({ connectionId, operationName: null, arguments: {} });
  };

  const handleOperationChange = (operationName: string | null) => {
    updateFormData({ ...formData, operationName, arguments: {} });
  };

  const handleArgumentChange = (
    field: JsonSchemaArgumentField,
    value: string | null,
  ) => {
    const coercedValue = coerceJsonSchemaArgumentValue(value, field.type);
    const { [field.name]: _previousValue, ...otherArguments } =
      formData.arguments ?? {};

    updateFormData({
      ...formData,
      arguments: isDefined(coercedValue)
        ? { ...otherArguments, [field.name]: coercedValue }
        : otherArguments,
    });
  };

  const renderArgumentField = (field: JsonSchemaArgumentField) => {
    const label = field.isRequired ? `${field.name} *` : field.name;
    const defaultValue = formatArgumentValue(formData.arguments?.[field.name]);
    const key = `${formData.operationName}-${field.name}`;

    if (field.type === 'object' || field.type === 'array') {
      return (
        <FormRawJsonFieldInput
          key={key}
          label={label}
          defaultValue={defaultValue}
          onChange={(value) => handleArgumentChange(field, value)}
          readonly={isReadonly}
          VariablePicker={WorkflowVariablePicker}
        />
      );
    }

    return (
      <FormTextFieldInput
        key={key}
        label={label}
        hint={field.description}
        defaultValue={defaultValue}
        onChange={(value) => handleArgumentChange(field, value)}
        readonly={isReadonly}
        VariablePicker={WorkflowVariablePicker}
      />
    );
  };

  return (
    <>
      <WorkflowStepBody>
        <StyledContent>
          {!isLoadingConnections && connections.length === 0 && (
            <StyledHelperText>
              {t`No connected APIs. Add one in Settings > Integrations.`}
            </StyledHelperText>
          )}
          <Select
            label={t`API`}
            dropdownId={`api-connection-call-connection-${action.id}`}
            options={connections.map((connection) => ({
              label: connection.name,
              value: connection.id,
            }))}
            emptyOption={{ label: t`Select an API`, value: null }}
            value={formData.connectionId ?? null}
            onChange={handleConnectionChange}
            disabled={isReadonly}
            dropdownWidth={GenericDropdownContentWidth.ExtraLarge}
          />
          {isDefined(formData.connectionId) && (
            <Select
              label={t`Operation`}
              dropdownId={`api-connection-call-operation-${action.id}`}
              options={operations.map((operation) => ({
                label: `${operation.method} ${operation.path} (${operation.name})`,
                value: operation.name,
              }))}
              emptyOption={{
                label: isLoadingOperations
                  ? t`Loading operations...`
                  : t`Select an operation`,
                value: null,
              }}
              value={formData.operationName ?? null}
              onChange={handleOperationChange}
              disabled={isReadonly || isLoadingOperations}
              withSearchInput
              dropdownWidth={GenericDropdownContentWidth.ExtraLarge}
            />
          )}
          {isDefined(operationsError) && (
            <StyledHelperText>
              {t`Could not load operations for this API: ${operationsError.message}`}
            </StyledHelperText>
          )}
          {isDefined(selectedOperation?.description) && (
            <StyledOperationDescription title={selectedOperation.description}>
              {selectedOperation.description}
            </StyledOperationDescription>
          )}
          {isDefined(selectedOperation) && argumentFields.length === 0 && (
            <StyledHelperText>
              {t`This operation takes no inputs.`}
            </StyledHelperText>
          )}
          {argumentFields.map(renderArgumentField)}
          {isDefined(formData.operationName) && (
            <FormRawJsonFieldInput
              label={t`Expected Response`}
              placeholder={JSON_RESPONSE_PLACEHOLDER}
              defaultValue={outputSchema}
              onChange={handleOutputSchemaChange}
              readonly={isReadonly}
              error={error}
            />
          )}
        </StyledContent>
      </WorkflowStepBody>
      {!isReadonly && <WorkflowStepFooter stepId={action.id} />}
    </>
  );
};
