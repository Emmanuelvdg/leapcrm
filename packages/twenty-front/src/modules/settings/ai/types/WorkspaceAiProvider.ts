export type WorkspaceAiProviderModel = {
  name: string;
  label: string;
  inputCostPerMillionTokens?: number;
  outputCostPerMillionTokens?: number;
  contextWindowTokens?: number;
  maxOutputTokens?: number;
};

export type WorkspaceAiProvider = {
  id: string;
  providerName: string;
  npm: string;
  label: string;
  baseUrl?: string;
  hasApiKey: boolean;
  models: WorkspaceAiProviderModel[];
  createdAt: string;
  updatedAt: string;
};
