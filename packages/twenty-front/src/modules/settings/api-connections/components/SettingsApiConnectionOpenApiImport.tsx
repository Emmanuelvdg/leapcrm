import { type ApiConnectionOperation } from '@/settings/api-connections/types/ApiConnectionOperation';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { TextArea } from '@/ui/input/components/TextArea';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Button, Checkbox } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { PreviewOpenApiImportDocument } from '~/generated-metadata/graphql';

const StyledCard = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledOperationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  max-height: 320px;
  overflow-y: auto;
`;

const StyledOperationRow = styled.label`
  align-items: center;
  cursor: pointer;
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledMethod = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-family: monospace;
  min-width: 56px;
`;

const StyledHint = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

type SettingsApiConnectionOpenApiImportProps = {
  instanceId: string;
  initialSpecUrl: string;
  onImport: (args: {
    operations: ApiConnectionOperation[];
    specUrl: string | null;
    suggestedBaseUrl: string | null;
  }) => void;
  onCancel: () => void;
};

export const SettingsApiConnectionOpenApiImport = ({
  instanceId,
  initialSpecUrl,
  onImport,
  onCancel,
}: SettingsApiConnectionOpenApiImportProps) => {
  const { t } = useLingui();
  const { enqueueErrorSnackBar } = useSnackBar();
  const [specUrl, setSpecUrl] = useState(initialSpecUrl);
  const [specJson, setSpecJson] = useState('');
  const [preview, setPreview] = useState<{
    operations: ApiConnectionOperation[];
    skipped: string[];
    suggestedBaseUrl: string | null;
  } | null>(null);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());

  const [previewOpenApiImport, { loading }] = useMutation(
    PreviewOpenApiImportDocument,
  );

  const handlePreview = async () => {
    try {
      const { data } = await previewOpenApiImport({
        variables: {
          input: isNonEmptyString(specJson.trim())
            ? { specJson }
            : { specUrl: specUrl.trim() },
        },
      });

      const result = data?.previewOpenApiImport;

      if (!isDefined(result)) {
        return;
      }

      setPreview({
        operations: result.operations as ApiConnectionOperation[],
        skipped: result.skipped,
        suggestedBaseUrl: result.suggestedBaseUrl ?? null,
      });
      setSelectedNames(new Set());
    } catch (error) {
      enqueueErrorSnackBar({
        apolloError: CombinedGraphQLErrors.is(error) ? error : undefined,
      });
    }
  };

  const toggleOperation = (name: string, isSelected: boolean) => {
    const nextSelectedNames = new Set(selectedNames);

    if (isSelected) {
      nextSelectedNames.add(name);
    } else {
      nextSelectedNames.delete(name);
    }

    setSelectedNames(nextSelectedNames);
  };

  const handleImport = () => {
    if (!isDefined(preview)) {
      return;
    }

    onImport({
      operations: preview.operations
        .filter((operation) => selectedNames.has(operation.name))
        .map((operation) => ({ ...operation, isEnabled: true })),
      specUrl: isNonEmptyString(specJson.trim()) ? null : specUrl.trim(),
      suggestedBaseUrl: preview.suggestedBaseUrl,
    });
  };

  const selectedCount = selectedNames.size;

  return (
    <StyledCard>
      <SettingsTextInput
        instanceId={`${instanceId}-spec-url`}
        label={t`OpenAPI document URL`}
        placeholder={t`https://api.example.com/openapi.json`}
        value={specUrl}
        onChange={setSpecUrl}
        fullWidth
      />
      <TextArea
        textAreaId={`${instanceId}-spec-json`}
        label={t`Or paste the OpenAPI 3.x JSON document`}
        minRows={3}
        maxRows={10}
        value={specJson}
        onChange={setSpecJson}
      />
      <StyledActions>
        <Button
          title={t`Cancel`}
          variant="secondary"
          size="small"
          onClick={onCancel}
        />
        <Button
          title={loading ? t`Loading...` : t`Preview operations`}
          variant="secondary"
          size="small"
          disabled={
            loading ||
            (!isNonEmptyString(specUrl.trim()) &&
              !isNonEmptyString(specJson.trim()))
          }
          onClick={handlePreview}
        />
      </StyledActions>
      {isDefined(preview) && (
        <>
          <StyledHint>
            {t`Tick the operations to add. Only add what the AI and workflows need.`}
          </StyledHint>
          <StyledOperationList>
            {preview.operations.map((operation) => (
              <StyledOperationRow key={operation.name}>
                <Checkbox
                  checked={selectedNames.has(operation.name)}
                  onCheckedChange={(isChecked) =>
                    toggleOperation(operation.name, isChecked)
                  }
                />
                <StyledMethod>{operation.method}</StyledMethod>
                <span title={operation.description}>
                  {operation.path} ({operation.name})
                </span>
              </StyledOperationRow>
            ))}
          </StyledOperationList>
          {preview.skipped.length > 0 && (
            <StyledHint title={preview.skipped.join('\n')}>
              {t`${preview.skipped.length} operations were skipped (hover for details).`}
            </StyledHint>
          )}
          <StyledActions>
            <Button
              title={t`Add ${selectedCount} operations`}
              variant="primary"
              accent="blue"
              size="small"
              disabled={selectedCount === 0}
              onClick={handleImport}
            />
          </StyledActions>
        </>
      )}
    </StyledCard>
  );
};
