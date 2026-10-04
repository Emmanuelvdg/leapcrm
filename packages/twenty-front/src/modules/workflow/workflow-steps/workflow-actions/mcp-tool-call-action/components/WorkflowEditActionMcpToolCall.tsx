import { FormRawJsonFieldInput } from '@/object-record/record-field/ui/form-types/components/FormRawJsonFieldInput';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { Select } from '@/ui/input/components/Select';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { type WorkflowMcpToolCallAction } from '@/workflow/types/Workflow';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepFooter } from '@/workflow/workflow-steps/components/WorkflowStepFooter';
import { JSON_RESPONSE_PLACEHOLDER } from '@/workflow/workflow-steps/workflow-actions/http-request-action/constants/HttpRequest';
import { useHttpRequestOutputSchema } from '@/workflow/workflow-steps/workflow-actions/http-request-action/hooks/useHttpRequestOutputSchema';
import { type McpToolArgumentField } from '@/workflow/workflow-steps/workflow-actions/mcp-tool-call-action/types/McpToolArgumentField';
import { coerceMcpToolArgumentValue } from '@/workflow/workflow-steps/workflow-actions/mcp-tool-call-action/utils/coerceMcpToolArgumentValue';
import { getMcpToolArgumentFields } from '@/workflow/workflow-steps/workflow-actions/mcp-tool-call-action/utils/getMcpToolArgumentFields';
import { WorkflowVariablePicker } from '@/workflow/workflow-variables/components/WorkflowVariablePicker';
import { useQuery } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useDebouncedCallback } from 'use-debounce';
import {
  GetConnectedMcpServerConnectionsDocument,
  GetMcpServerConnectionToolsDocument,
} from '~/generated-metadata/graphql';

type WorkflowEditActionMcpToolCallProps = {
  action: WorkflowMcpToolCallAction;
  actionOptions: {
    readonly?: boolean;
    onActionUpdate?: (action: WorkflowMcpToolCallAction) => void;
  };
};

type McpToolCallFormData = WorkflowMcpToolCallAction['settings']['input'];

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

// Some servers write paragraph-long tool descriptions that would push the
// inputs out of view; the full text stays available on hover.
const StyledToolDescription = styled.div`
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

export const WorkflowEditActionMcpToolCall = ({
  action,
  actionOptions,
}: WorkflowEditActionMcpToolCallProps) => {
  const { t } = useLingui();
  const isReadonly = actionOptions.readonly === true;

  const [formData, setFormData] = useState<McpToolCallFormData>({
    connectionId: action.settings.input.connectionId ?? null,
    toolName: action.settings.input.toolName ?? null,
    arguments: action.settings.input.arguments ?? {},
  });

  const { data: connectionsData, loading: isLoadingConnections } = useQuery(
    GetConnectedMcpServerConnectionsDocument,
  );

  const {
    data: toolsData,
    loading: isLoadingTools,
    error: toolsError,
  } = useQuery(GetMcpServerConnectionToolsDocument, {
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
    (nextFormData: McpToolCallFormData) => {
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

  const updateFormData = (nextFormData: McpToolCallFormData) => {
    setFormData(nextFormData);
    saveAction(nextFormData);
  };

  const connections = connectionsData?.connectedMcpServerConnections ?? [];
  const tools = toolsData?.mcpServerConnectionTools ?? [];
  const selectedTool = tools.find((tool) => tool.name === formData.toolName);
  const argumentFields = getMcpToolArgumentFields(selectedTool?.inputSchema);

  const handleConnectionChange = (connectionId: string | null) => {
    updateFormData({ connectionId, toolName: null, arguments: {} });
  };

  const handleToolChange = (toolName: string | null) => {
    updateFormData({ ...formData, toolName, arguments: {} });
  };

  const handleArgumentChange = (
    field: McpToolArgumentField,
    value: string | null,
  ) => {
    const coercedValue = coerceMcpToolArgumentValue(value, field.type);
    const { [field.name]: _previousValue, ...otherArguments } =
      formData.arguments ?? {};

    updateFormData({
      ...formData,
      arguments: isDefined(coercedValue)
        ? { ...otherArguments, [field.name]: coercedValue }
        : otherArguments,
    });
  };

  const renderArgumentField = (field: McpToolArgumentField) => {
    const label = field.isRequired ? `${field.name} *` : field.name;
    const defaultValue = formatArgumentValue(formData.arguments?.[field.name]);
    const key = `${formData.toolName}-${field.name}`;

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
              {t`No connected MCP servers. Add one in Settings > Integrations.`}
            </StyledHelperText>
          )}
          <Select
            label={t`MCP Server`}
            dropdownId={`mcp-tool-call-connection-${action.id}`}
            options={connections.map((connection) => ({
              label: connection.name,
              value: connection.id,
            }))}
            emptyOption={{ label: t`Select a server`, value: null }}
            value={formData.connectionId ?? null}
            onChange={handleConnectionChange}
            disabled={isReadonly}
            dropdownWidth={GenericDropdownContentWidth.ExtraLarge}
          />
          {isDefined(formData.connectionId) && (
            <Select
              label={t`Tool`}
              dropdownId={`mcp-tool-call-tool-${action.id}`}
              options={tools.map((tool) => ({
                label: tool.name,
                value: tool.name,
              }))}
              emptyOption={{
                label: isLoadingTools ? t`Loading tools...` : t`Select a tool`,
                value: null,
              }}
              value={formData.toolName ?? null}
              onChange={handleToolChange}
              disabled={isReadonly || isLoadingTools}
              withSearchInput
              dropdownWidth={GenericDropdownContentWidth.ExtraLarge}
            />
          )}
          {isDefined(toolsError) && (
            <StyledHelperText>
              {t`Could not load tools from this server: ${toolsError.message}`}
            </StyledHelperText>
          )}
          {isDefined(selectedTool?.description) && (
            <StyledToolDescription title={selectedTool.description}>
              {selectedTool.description}
            </StyledToolDescription>
          )}
          {isDefined(selectedTool) && argumentFields.length === 0 && (
            <StyledHelperText>{t`This tool takes no inputs.`}</StyledHelperText>
          )}
          {argumentFields.map(renderArgumentField)}
          {isDefined(formData.toolName) && (
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
