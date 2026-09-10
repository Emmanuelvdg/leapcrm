import { useState } from 'react';
import { styled } from '@linaria/react';

import { useMutation, useQuery } from '@apollo/client/react';
import { t } from '@lingui/core/macro';
import { slugify } from 'transliteration';
import { IconKey, IconPlug, IconPlus, IconTrash, IconX } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { H2Title } from 'twenty-ui/typography';
import { Section } from 'twenty-ui/layout';
import { Card, CardContent } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ADD_WORKSPACE_AI_PROVIDER } from '@/settings/ai/graphql/mutations/addWorkspaceAiProvider';
import { REMOVE_WORKSPACE_AI_PROVIDER } from '@/settings/ai/graphql/mutations/removeWorkspaceAiProvider';
import { GET_WORKSPACE_AI_PROVIDERS } from '@/settings/ai/graphql/queries/getWorkspaceAiProviders';
import { type WorkspaceAiProvider } from '@/settings/ai/types/WorkspaceAiProvider';
import { SettingsListCard } from '@/settings/components/SettingsListCard';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { TextInput } from '@/ui/input/components/TextInput';

const OPENAI_COMPATIBLE_NPM = '@ai-sdk/openai-compatible';

const StyledFormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledFieldRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledFieldLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledModelRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledModelList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledModelChip = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
`;

const StyledFormActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

type DraftModel = { name: string; label: string };

const RemoveProviderButton = ({ item }: { item: WorkspaceAiProvider }) => {
  const { enqueueErrorSnackBar } = useSnackBar();
  const [removeWorkspaceAiProvider] = useMutation(
    REMOVE_WORKSPACE_AI_PROVIDER,
    {
      refetchQueries: [{ query: GET_WORKSPACE_AI_PROVIDERS }],
    },
  );

  return (
    <Button
      Icon={IconTrash}
      variant="secondary"
      accent="danger"
      onClick={async () => {
        try {
          await removeWorkspaceAiProvider({ variables: { id: item.id } });
        } catch {
          enqueueErrorSnackBar({ message: t`Failed to remove provider` });
        }
      }}
    />
  );
};

export const SettingsAiProvidersSection = () => {
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const [isAdding, setIsAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [draftModelName, setDraftModelName] = useState('');
  const [draftModelLabel, setDraftModelLabel] = useState('');
  const [models, setModels] = useState<DraftModel[]>([]);

  const { data } = useQuery<{
    getWorkspaceAiProviders: WorkspaceAiProvider[];
  }>(GET_WORKSPACE_AI_PROVIDERS);

  const [addWorkspaceAiProvider, { loading: isSaving }] = useMutation(
    ADD_WORKSPACE_AI_PROVIDER,
    { refetchQueries: [{ query: GET_WORKSPACE_AI_PROVIDERS }] },
  );

  const providers = data?.getWorkspaceAiProviders ?? [];

  const resetForm = () => {
    setIsAdding(false);
    setLabel('');
    setApiKey('');
    setBaseUrl('');
    setDraftModelName('');
    setDraftModelLabel('');
    setModels([]);
  };

  const handleAddModel = () => {
    if (!draftModelName.trim() || !draftModelLabel.trim()) {
      return;
    }

    setModels((current) => [
      ...current,
      { name: draftModelName.trim(), label: draftModelLabel.trim() },
    ]);
    setDraftModelName('');
    setDraftModelLabel('');
  };

  const handleSave = async () => {
    const trimmedLabel = label.trim();
    const providerName = slugify(trimmedLabel, { separator: '-' });

    if (!trimmedLabel || !providerName) {
      enqueueErrorSnackBar({ message: t`A provider name is required` });

      return;
    }

    if (!baseUrl.trim()) {
      enqueueErrorSnackBar({ message: t`A base URL is required` });

      return;
    }

    if (models.length === 0) {
      enqueueErrorSnackBar({
        message: t`Add at least one model`,
      });

      return;
    }

    try {
      await addWorkspaceAiProvider({
        variables: {
          input: {
            providerName,
            npm: OPENAI_COMPATIBLE_NPM,
            label: trimmedLabel,
            baseUrl: baseUrl.trim(),
            apiKey: apiKey.trim() || undefined,
            models,
          },
        },
      });

      enqueueSuccessSnackBar({
        message: t`Provider "${trimmedLabel}" added`,
      });
      resetForm();
    } catch {
      enqueueErrorSnackBar({ message: t`Failed to add provider` });
    }
  };

  return (
    <Section>
      <H2Title
        title={t`AI Providers`}
        description={t`Connect your own AI provider (for example OpenRouter) for this workspace. Your API key is only used by this workspace.`}
      />

      <SettingsListCard
        items={providers}
        getItemLabel={(item) => item.label}
        getItemDescription={(item) =>
          item.hasApiKey
            ? t`${item.models.length} model(s) · API key configured`
            : t`${item.models.length} model(s) · No API key`
        }
        RowIcon={IconPlug}
        RowRightComponent={RemoveProviderButton}
        hasFooter={!isAdding}
        footerButtonLabel={t`Add provider`}
        onFooterButtonClick={() => setIsAdding(true)}
        rounded
      />

      {isAdding && (
        <Card rounded>
          <CardContent>
            <StyledFormContainer>
              <StyledFieldRow>
                <StyledFieldLabel>{t`Label`}</StyledFieldLabel>
                <TextInput
                  value={label}
                  onChange={setLabel}
                  placeholder={t`e.g. OpenRouter`}
                  fullWidth
                />
              </StyledFieldRow>

              <StyledFieldRow>
                <StyledFieldLabel>{t`Base URL`}</StyledFieldLabel>
                <TextInput
                  value={baseUrl}
                  onChange={setBaseUrl}
                  placeholder="https://openrouter.ai/api/v1"
                  fullWidth
                />
              </StyledFieldRow>

              <StyledFieldRow>
                <StyledFieldLabel>{t`API Key`}</StyledFieldLabel>
                <TextInput
                  value={apiKey}
                  onChange={setApiKey}
                  placeholder="sk-or-..."
                  type="password"
                  fullWidth
                  RightIcon={IconKey}
                />
              </StyledFieldRow>

              <StyledFieldRow>
                <StyledFieldLabel>{t`Models`}</StyledFieldLabel>
                <StyledModelList>
                  {models.map((model) => (
                    <StyledModelChip key={model.name}>
                      <span>
                        {model.label} ({model.name})
                      </span>
                      <Button
                        Icon={IconX}
                        variant="tertiary"
                        onClick={() =>
                          setModels((current) =>
                            current.filter((m) => m.name !== model.name),
                          )
                        }
                      />
                    </StyledModelChip>
                  ))}
                </StyledModelList>
                <StyledModelRow>
                  <TextInput
                    value={draftModelName}
                    onChange={setDraftModelName}
                    placeholder={t`Model id, e.g. anthropic/claude-3.5-sonnet`}
                    fullWidth
                  />
                  <TextInput
                    value={draftModelLabel}
                    onChange={setDraftModelLabel}
                    placeholder={t`Display name`}
                    fullWidth
                  />
                  <Button
                    Icon={IconPlus}
                    variant="secondary"
                    onClick={handleAddModel}
                  />
                </StyledModelRow>
              </StyledFieldRow>

              <StyledFormActions>
                <Button
                  title={t`Cancel`}
                  variant="secondary"
                  onClick={resetForm}
                />
                <Button
                  title={t`Save`}
                  variant="primary"
                  accent="blue"
                  disabled={isSaving}
                  onClick={handleSave}
                />
              </StyledFormActions>
            </StyledFormContainer>
          </CardContent>
        </Card>
      )}
    </Section>
  );
};
