import { type ApiConnectionOperation } from '@/settings/api-connections/types/ApiConnectionOperation';
import {
  type ApiConnectionOperationDraft,
  EMPTY_API_CONNECTION_OPERATION_DRAFT,
  parseApiConnectionOperationDraft,
  toApiConnectionOperationDraft,
} from '@/settings/api-connections/utils/apiConnectionOperationDraft';
import { Select } from '@/ui/input/components/Select';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { TextArea } from '@/ui/input/components/TextArea';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledCard = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledRow = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: 120px 1fr;
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

const StyledError = styled.div`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
`;

const HTTP_METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(
  (method) => ({ label: method, value: method }),
);

type SettingsApiConnectionOperationEditorProps = {
  instanceId: string;
  operation?: ApiConnectionOperation;
  onSave: (operation: ApiConnectionOperation) => void;
  onCancel: () => void;
};

export const SettingsApiConnectionOperationEditor = ({
  instanceId,
  operation,
  onSave,
  onCancel,
}: SettingsApiConnectionOperationEditorProps) => {
  const { t } = useLingui();
  const [draft, setDraft] = useState<ApiConnectionOperationDraft>(
    isDefined(operation)
      ? toApiConnectionOperationDraft(operation)
      : EMPTY_API_CONNECTION_OPERATION_DRAFT,
  );
  const [error, setError] = useState<string | null>(null);

  const updateDraft = (changes: Partial<ApiConnectionOperationDraft>) => {
    setDraft({ ...draft, ...changes });
  };

  const handleSave = () => {
    const { operation: parsedOperation, error: parseError } =
      parseApiConnectionOperationDraft(draft);

    if (!isDefined(parsedOperation)) {
      setError(parseError);
      return;
    }

    onSave(parsedOperation);
  };

  return (
    <StyledCard>
      <SettingsTextInput
        instanceId={`${instanceId}-name`}
        label={t`Name`}
        placeholder={t`e.g. search_contacts_count`}
        value={draft.name}
        onChange={(name) => updateDraft({ name })}
        fullWidth
      />
      <StyledRow>
        <Select
          label={t`Method`}
          dropdownId={`${instanceId}-method`}
          options={HTTP_METHOD_OPTIONS}
          value={draft.method}
          onChange={(method) =>
            updateDraft({
              method: method as ApiConnectionOperationDraft['method'],
            })
          }
          fullWidth
        />
        <SettingsTextInput
          instanceId={`${instanceId}-path`}
          label={t`Path`}
          placeholder={t`/contacts/{contactId}`}
          value={draft.path}
          onChange={(path) => updateDraft({ path })}
          fullWidth
        />
      </StyledRow>
      <TextArea
        textAreaId={`${instanceId}-description`}
        label={t`Description (read by the AI)`}
        minRows={2}
        value={draft.description}
        onChange={(description) => updateDraft({ description })}
      />
      <TextArea
        textAreaId={`${instanceId}-parameters`}
        label={t`Path, query and header parameters (JSON)`}
        minRows={3}
        value={draft.parametersJson}
        onChange={(parametersJson) => updateDraft({ parametersJson })}
      />
      <TextArea
        textAreaId={`${instanceId}-request-body-schema`}
        label={t`Request body JSON Schema (leave empty for no body)`}
        minRows={4}
        value={draft.requestBodySchemaJson}
        onChange={(requestBodySchemaJson) =>
          updateDraft({ requestBodySchemaJson })
        }
      />
      {isDefined(error) && <StyledError>{error}</StyledError>}
      <StyledActions>
        <Button
          title={t`Cancel`}
          variant="secondary"
          size="small"
          onClick={onCancel}
        />
        <Button
          title={t`Done`}
          variant="primary"
          accent="blue"
          size="small"
          onClick={handleSave}
        />
      </StyledActions>
    </StyledCard>
  );
};
