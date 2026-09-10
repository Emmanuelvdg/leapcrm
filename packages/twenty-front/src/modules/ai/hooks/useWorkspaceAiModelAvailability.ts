import { useQuery } from '@apollo/client/react';
import { isAutoSelectModelId } from 'twenty-shared/utils';

import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { aiModelsState } from '@/client-config/states/aiModelsState';
import { GET_WORKSPACE_AI_PROVIDERS } from '@/settings/ai/graphql/queries/getWorkspaceAiProviders';
import { type WorkspaceAiProvider } from '@/settings/ai/types/WorkspaceAiProvider';
import { mapWorkspaceAiProviderToClientAiModelConfigs } from '@/settings/ai/utils/mapWorkspaceAiProviderToClientAiModelConfigs';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const useWorkspaceAiModelAvailability = () => {
  const aiModels = useAtomStateValue(aiModelsState);
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  // Additive overlay: this tenant's own configured providers, merged on top
  // of the instance-wide catalog. Apollo's cache de-dupes this across every
  // hook call site, so no extra fetching cost from being called widely.
  const { data: workspaceProvidersData } = useQuery<{
    getWorkspaceAiProviders: WorkspaceAiProvider[];
  }>(GET_WORKSPACE_AI_PROVIDERS);

  const workspaceProviderModels = (
    workspaceProvidersData?.getWorkspaceAiProviders ?? []
  ).flatMap(mapWorkspaceAiProviderToClientAiModelConfigs);

  const useRecommendedModels = currentWorkspace?.useRecommendedModels ?? true;
  const enabledAiModelIds = new Set(currentWorkspace?.enabledAiModelIds ?? []);

  const realModels = [...aiModels, ...workspaceProviderModels].filter(
    (model) => !isAutoSelectModelId(model.modelId) && !model.isDeprecated,
  );

  const enabledModels = useRecommendedModels
    ? realModels.filter((model) => model.isRecommended === true)
    : realModels.filter((model) => enabledAiModelIds.has(model.modelId));

  return {
    enabledModels,
    realModels,
    useRecommendedModels,
  };
};
