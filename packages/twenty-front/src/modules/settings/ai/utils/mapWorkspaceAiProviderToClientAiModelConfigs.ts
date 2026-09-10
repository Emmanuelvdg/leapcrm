import { type WorkspaceAiProvider } from '@/settings/ai/types/WorkspaceAiProvider';
import { type ClientAiModelConfig } from '~/generated-metadata/graphql';

// Mirrors the server's buildCompositeModelId() — kept in sync by hand since
// it's a tiny, stable piece of logic not worth sharing across packages for.
const buildCompositeModelId = (providerName: string, modelName: string) =>
  providerName === modelName.split('/')[0]
    ? modelName
    : `${providerName}/${modelName}`;

export const mapWorkspaceAiProviderToClientAiModelConfigs = (
  provider: WorkspaceAiProvider,
): ClientAiModelConfig[] =>
  provider.models.map((model) => ({
    modelId: buildCompositeModelId(provider.providerName, model.name),
    label: model.label,
    sdkPackage: provider.npm,
    inputCostPerMillionTokens: model.inputCostPerMillionTokens,
    outputCostPerMillionTokens: model.outputCostPerMillionTokens,
    contextWindowTokens: model.contextWindowTokens,
    maxOutputTokens: model.maxOutputTokens,
    providerName: provider.providerName,
    providerLabel: provider.label,
    // A tenant's own model is always shown — it isn't part of the shared
    // catalog the "use best models only" toggle curates.
    isRecommended: true,
  })) as ClientAiModelConfig[];
