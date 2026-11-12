import { SettingsApiConnectionOpenApiImport } from '@/settings/api-connections/components/SettingsApiConnectionOpenApiImport';
import { SettingsApiConnectionOperationEditor } from '@/settings/api-connections/components/SettingsApiConnectionOperationEditor';
import { type ApiConnectionOperation } from '@/settings/api-connections/types/ApiConnectionOperation';
import { mergeApiConnectionOperations } from '@/settings/api-connections/utils/mergeApiConnectionOperations';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import {
  IconFileImport,
  IconPencil,
  IconPlus,
  IconTrash,
} from 'twenty-ui/icon';
import { Button, IconButton, Toggle } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';

const NEW_OPERATION_INDEX = -1;

const StyledList = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
`;

const StyledOperationRow = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: auto 64px 1fr auto auto;
  padding: ${themeCssVariables.spacing[2]};

  &:last-child {
    border-bottom: none;
  }
`;

const StyledMethod = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-family: monospace;
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledOperationText = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const StyledPath = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledName = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledButtons = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  padding-top: ${themeCssVariables.spacing[2]};
`;

const StyledPanel = styled.div`
  padding-top: ${themeCssVariables.spacing[2]};
`;

type SettingsApiConnectionOperationsSectionProps = {
  instanceId: string;
  operations: ApiConnectionOperation[];
  openApiSpecUrl: string;
  onOperationsChange: (operations: ApiConnectionOperation[]) => void;
  onOpenApiImported: (args: {
    specUrl: string | null;
    suggestedBaseUrl: string | null;
  }) => void;
};

export const SettingsApiConnectionOperationsSection = ({
  instanceId,
  operations,
  openApiSpecUrl,
  onOperationsChange,
  onOpenApiImported,
}: SettingsApiConnectionOperationsSectionProps) => {
  const { t } = useLingui();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleOperationSave = (operation: ApiConnectionOperation) => {
    const otherOperations = operations.filter(
      (_, index) => index !== editingIndex,
    );

    onOperationsChange(
      editingIndex === NEW_OPERATION_INDEX || editingIndex === null
        ? mergeApiConnectionOperations(otherOperations, [operation])
        : operations.map((existing, index) =>
            index === editingIndex ? operation : existing,
          ),
    );
    setEditingIndex(null);
  };

  const handleToggle = (operationIndex: number, isEnabled: boolean) => {
    onOperationsChange(
      operations.map((operation, index) =>
        index === operationIndex ? { ...operation, isEnabled } : operation,
      ),
    );
  };

  const handleRemove = (operationIndex: number) => {
    onOperationsChange(
      operations.filter((_, index) => index !== operationIndex),
    );
  };

  const isPanelOpen = editingIndex !== null || isImporting;

  return (
    <Section>
      <H2Title
        title={t`Operations`}
        description={t`Endpoints the AI and workflows can call. Only enabled operations are exposed.`}
      />
      <StyledList>
        {operations.length === 0 && (
          <StyledEmpty>{t`No operations yet. Add one or import an OpenAPI document.`}</StyledEmpty>
        )}
        {operations.map((operation, index) => (
          <StyledOperationRow key={operation.name}>
            <Toggle
              value={operation.isEnabled}
              onChange={(isEnabled) => handleToggle(index, isEnabled)}
              aria-label={t`Enable ${operation.name}`}
            />
            <StyledMethod>{operation.method}</StyledMethod>
            <StyledOperationText title={operation.description}>
              <StyledPath>{operation.path}</StyledPath>
              <StyledName>{operation.name}</StyledName>
            </StyledOperationText>
            <IconButton
              Icon={IconPencil}
              variant="tertiary"
              size="small"
              ariaLabel={t`Edit ${operation.name}`}
              disabled={isPanelOpen}
              onClick={() => setEditingIndex(index)}
            />
            <IconButton
              Icon={IconTrash}
              variant="tertiary"
              size="small"
              accent="danger"
              ariaLabel={t`Remove ${operation.name}`}
              disabled={isPanelOpen}
              onClick={() => handleRemove(index)}
            />
          </StyledOperationRow>
        ))}
      </StyledList>
      {editingIndex !== null && (
        <StyledPanel>
          <SettingsApiConnectionOperationEditor
            key={editingIndex}
            instanceId={`${instanceId}-operation-${editingIndex}`}
            operation={
              editingIndex === NEW_OPERATION_INDEX
                ? undefined
                : operations[editingIndex]
            }
            onSave={handleOperationSave}
            onCancel={() => setEditingIndex(null)}
          />
        </StyledPanel>
      )}
      {isImporting && (
        <StyledPanel>
          <SettingsApiConnectionOpenApiImport
            instanceId={`${instanceId}-open-api`}
            initialSpecUrl={openApiSpecUrl}
            onImport={({ operations: imported, specUrl, suggestedBaseUrl }) => {
              onOperationsChange(
                mergeApiConnectionOperations(operations, imported),
              );
              onOpenApiImported({ specUrl, suggestedBaseUrl });
              setIsImporting(false);
            }}
            onCancel={() => setIsImporting(false)}
          />
        </StyledPanel>
      )}
      {!isPanelOpen && (
        <StyledButtons>
          <Button
            Icon={IconFileImport}
            title={t`Import from OpenAPI`}
            size="small"
            variant="secondary"
            onClick={() => setIsImporting(true)}
          />
          <Button
            Icon={IconPlus}
            title={t`Add operation`}
            size="small"
            variant="secondary"
            onClick={() => setEditingIndex(NEW_OPERATION_INDEX)}
          />
        </StyledButtons>
      )}
    </Section>
  );
};
