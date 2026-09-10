import { Injectable, Logger } from '@nestjs/common';

import { type LanguageModel } from 'ai';
import { type AiSdkPackage } from 'twenty-shared/ai';

import { ConfigVariablesGroup } from 'src/engine/core-modules/twenty-config/enums/config-variables-group.enum';
import { ConfigGroupHashService } from 'src/engine/core-modules/twenty-config/services/config-group-hash.service';
import { AiModelRole } from 'src/engine/metadata-modules/ai/ai-models/types/ai-model-role.enum';

import {
  AiException,
  AiExceptionCode,
} from 'src/engine/metadata-modules/ai/ai.exception';
import { AiModelPreferencesService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-preferences.service';
import { ProviderConfigService } from 'src/engine/metadata-modules/ai/ai-models/services/provider-config.service';
import { SdkProviderFactoryService } from 'src/engine/metadata-modules/ai/ai-models/services/sdk-provider-factory.service';
import { WorkspaceAiProviderService } from 'src/engine/metadata-modules/ai/ai-models/services/workspace-ai-provider.service';
import { type AiModelConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-model-config.type';
import { type AiProviderConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-provider-config.type';
import { type AiProviderModelConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-provider-model-config.type';
import { type AiProvidersConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-providers-config.type';
import { DEFAULT_CONTEXT_WINDOW_TOKENS } from 'src/engine/metadata-modules/ai/ai-models/types/default-context-window-tokens.const';
import {
  AUTO_SELECT_FAST_MODEL_ID,
  AUTO_SELECT_SMART_MODEL_ID,
} from 'twenty-shared/constants';
import { isAutoSelectModelId } from 'twenty-shared/utils';

import { DEFAULT_MAX_OUTPUT_TOKENS } from 'src/engine/metadata-modules/ai/ai-models/types/default-max-output-tokens.const';
import { buildCompositeModelId } from 'src/engine/metadata-modules/ai/ai-models/utils/composite-model-id.util';
import { inferModelFamily } from 'src/engine/metadata-modules/ai/ai-models/utils/infer-model-family.util';
import { isProviderConfigured } from 'src/engine/metadata-modules/ai/ai-models/utils/is-provider-configured.util';
import {
  isModelAllowedByWorkspace,
  type WorkspaceModelAvailabilitySettings,
} from 'src/engine/metadata-modules/ai/ai-models/utils/is-model-allowed.util';
import { workspaceHasEnabledModels } from 'src/engine/metadata-modules/ai/ai-models/utils/workspace-has-enabled-models.util';

export interface RegisteredAiModel {
  modelId: string;
  sdkPackage: AiSdkPackage;
  model: LanguageModel;
  supportsReasoning?: boolean;
  providerName?: string;
  modelsDevName?: string;
}

@Injectable()
export class AiModelRegistryService {
  private readonly logger = new Logger(AiModelRegistryService.name);
  private modelRegistry: Map<string, RegisteredAiModel> = new Map();
  private modelConfigCache: Map<string, AiModelConfig> = new Map();
  private providerModelDefCache: Map<
    string,
    { providerName: string; modelDef: AiProviderModelConfig }
  > = new Map();
  private currentConfigHash: string | null = null;

  // Per-workspace overlay: tenant-added providers layered on top of the
  // global registry above, never merged into it, so one tenant's custom
  // provider can never be looked up by another tenant.
  private workspaceRegistryCache: Map<
    string,
    {
      modelRegistry: Map<string, RegisteredAiModel>;
      modelConfigCache: Map<string, AiModelConfig>;
      builtAt: number;
    }
  > = new Map();

  private static readonly WORKSPACE_REGISTRY_TTL_MS = 30_000;

  constructor(
    private readonly providerConfigService: ProviderConfigService,
    private readonly sdkProviderFactory: SdkProviderFactoryService,
    private readonly preferencesService: AiModelPreferencesService,
    private readonly configGroupHashService: ConfigGroupHashService,
    private readonly workspaceAiProviderService: WorkspaceAiProviderService,
  ) {}

  // The registry is rebuilt lazily whenever the LLM-group config hash changes,
  // so any mutation to an LLM-tagged config variable is picked up automatically
  // on the next read — no explicit refresh from callers needed.
  private ensureFresh(): void {
    const configHash = this.configGroupHashService.computeHash(
      ConfigVariablesGroup.LLM,
    );

    if (configHash === this.currentConfigHash) {
      return;
    }

    this.buildModelRegistry();
    this.currentConfigHash = configHash;
  }

  private buildModelRegistry(): void {
    this.modelRegistry.clear();
    this.sdkProviderFactory.clearCache();
    this.modelConfigCache.clear();
    this.providerModelDefCache.clear();

    const providers = this.providerConfigService.getResolvedProviders();

    this.registerModelsFromProviders(providers);
  }

  private registerModelsFromProviders(providers: AiProvidersConfig): void {
    this.populateRegistryForProviders(providers, {
      modelRegistry: this.modelRegistry,
      modelConfigCache: this.modelConfigCache,
      providerModelDefCache: this.providerModelDefCache,
    });
  }

  // Shared by the global registry and the per-workspace overlay below.
  // `sdkProviderCacheKeyPrefix` namespaces SdkProviderFactoryService's
  // internal cache (keyed only by the string passed in) so a workspace's
  // provider named e.g. "openrouter" can never collide with the instance
  // catalog's or another workspace's provider of the same name.
  private populateRegistryForProviders(
    providers: AiProvidersConfig,
    targets: {
      modelRegistry: Map<string, RegisteredAiModel>;
      modelConfigCache: Map<string, AiModelConfig>;
      providerModelDefCache?: Map<
        string,
        { providerName: string; modelDef: AiProviderModelConfig }
      >;
    },
    sdkProviderCacheKeyPrefix = '',
  ): void {
    for (const [providerKey, config] of Object.entries(providers)) {
      if (!config.npm) {
        this.logger.warn(
          `Skipping provider "${providerKey}": missing npm field`,
        );
        continue;
      }

      const models = config.models ?? [];

      if (models.length === 0) {
        continue;
      }

      const sdkInstance = isProviderConfigured(config)
        ? this.sdkProviderFactory.createProvider(
            `${sdkProviderCacheKeyPrefix}${providerKey}`,
            config,
          )
        : undefined;

      for (const modelDef of models) {
        const compositeId = buildCompositeModelId(providerKey, modelDef.name);

        targets.modelConfigCache.set(
          compositeId,
          this.toAiModelConfig(compositeId, config, modelDef),
        );

        targets.providerModelDefCache?.set(compositeId, {
          providerName: providerKey,
          modelDef,
        });

        if (sdkInstance) {
          targets.modelRegistry.set(compositeId, {
            modelId: compositeId,
            sdkPackage: config.npm,
            model: sdkInstance.createModel(modelDef.name),
            supportsReasoning: modelDef.supportsReasoning,
            providerName: providerKey,
            modelsDevName: config.name,
          });
        }
      }
    }
  }

  // Builds (or returns the still-fresh cached) per-workspace overlay of
  // tenant-added providers. Kept entirely separate from the global registry
  // above and keyed by workspaceId, so one tenant's models are never visible
  // to another's lookups.
  private async ensureFreshWorkspaceRegistry(workspaceId: string): Promise<{
    modelRegistry: Map<string, RegisteredAiModel>;
    modelConfigCache: Map<string, AiModelConfig>;
  }> {
    const cached = this.workspaceRegistryCache.get(workspaceId);
    const now = Date.now();

    if (
      cached &&
      now - cached.builtAt < AiModelRegistryService.WORKSPACE_REGISTRY_TTL_MS
    ) {
      return cached;
    }

    const providers =
      await this.workspaceAiProviderService.getResolvedProvidersForWorkspace(
        workspaceId,
      );

    const built = {
      modelRegistry: new Map<string, RegisteredAiModel>(),
      modelConfigCache: new Map<string, AiModelConfig>(),
      builtAt: now,
    };

    this.populateRegistryForProviders(
      providers,
      built,
      `ws:${workspaceId}:`,
    );

    this.workspaceRegistryCache.set(workspaceId, built);

    return built;
  }

  // Call after any create/update/delete of a workspace's own AI providers so
  // the next lookup rebuilds from the database instead of serving stale data
  // for up to WORKSPACE_REGISTRY_TTL_MS.
  invalidateWorkspaceRegistry(workspaceId: string): void {
    this.workspaceRegistryCache.delete(workspaceId);
  }

  // Workspace-aware counterpart to getModel(): checks the shared instance
  // registry first, then that workspace's own providers.
  async getModelForWorkspace(
    modelId: string,
    workspaceId: string,
  ): Promise<RegisteredAiModel | undefined> {
    const globalModel = this.getModel(modelId);

    if (globalModel) {
      return globalModel;
    }

    const workspaceRegistry = await this.ensureFreshWorkspaceRegistry(
      workspaceId,
    );

    return workspaceRegistry.modelRegistry.get(modelId);
  }

  // Workspace-aware counterpart to getAvailableModels(): the shared instance
  // catalog plus this workspace's own providers.
  async getAvailableModelsForWorkspace(
    workspaceId: string,
  ): Promise<RegisteredAiModel[]> {
    const globalModels = this.getAvailableModels();
    const workspaceRegistry =
      await this.ensureFreshWorkspaceRegistry(workspaceId);

    return [...globalModels, ...workspaceRegistry.modelRegistry.values()];
  }

  // Workspace-aware counterpart to getEffectiveModelConfig(). Auto-select
  // sentinels prefer the instance-wide admin-configured default — a tenant's
  // own providers are additive, not a replacement for the shared default
  // model preferences. But when the instance has no models configured at
  // all (a tenant relying solely on their own provider), fall back to the
  // first model in that tenant's own overlay rather than failing outright.
  async getEffectiveModelConfigForWorkspace(
    modelId: string,
    workspaceId: string,
  ): Promise<AiModelConfig> {
    if (isAutoSelectModelId(modelId)) {
      try {
        return this.getEffectiveModelConfig(modelId);
      } catch (error) {
        const workspaceRegistry =
          await this.ensureFreshWorkspaceRegistry(workspaceId);
        const [firstWorkspaceModel] = workspaceRegistry.modelRegistry.values();

        if (!firstWorkspaceModel) {
          throw error;
        }

        return (
          workspaceRegistry.modelConfigCache.get(
            firstWorkspaceModel.modelId,
          ) ?? this.createDefaultConfigForCustomModel(firstWorkspaceModel)
        );
      }
    }

    const globalConfig = this.getModelConfig(modelId);

    if (globalConfig) {
      return globalConfig;
    }

    const workspaceRegistry =
      await this.ensureFreshWorkspaceRegistry(workspaceId);
    const workspaceConfig = workspaceRegistry.modelConfigCache.get(modelId);

    if (workspaceConfig) {
      return workspaceConfig;
    }

    const registeredModel = workspaceRegistry.modelRegistry.get(modelId);

    if (registeredModel) {
      return this.createDefaultConfigForCustomModel(registeredModel);
    }

    throw new AiException(
      `Model with ID ${modelId} not found`,
      AiExceptionCode.AGENT_EXECUTION_FAILED,
    );
  }

  // Workspace-aware counterpart to resolveModelForAgent().
  async resolveModelForAgentForWorkspace(
    agent: { modelId: string } | null,
    workspaceId: string,
  ): Promise<RegisteredAiModel> {
    const aiModel = await this.getEffectiveModelConfigForWorkspace(
      agent?.modelId ?? AUTO_SELECT_SMART_MODEL_ID,
      workspaceId,
    );

    const registeredModel = await this.getModelForWorkspace(
      aiModel.modelId,
      workspaceId,
    );

    if (!registeredModel) {
      throw new AiException(
        `Model ${aiModel.modelId} not found in registry. Check that the corresponding AI provider is configured.`,
        AiExceptionCode.API_KEY_NOT_CONFIGURED,
      );
    }

    return registeredModel;
  }

  // Workspace-aware counterpart to validateModelAvailability(). A tenant's
  // own configured model is always usable by that tenant — it's not part of
  // the shared catalog the recommended/enabled-models toggles govern, so it
  // bypasses that check entirely rather than needing to be added to it.
  async validateModelAvailabilityForWorkspace(
    modelId: string,
    availabilitySettings: WorkspaceModelAvailabilitySettings,
    workspaceId: string,
  ): Promise<void> {
    if (!isAutoSelectModelId(modelId)) {
      const workspaceRegistry =
        await this.ensureFreshWorkspaceRegistry(workspaceId);

      if (workspaceRegistry.modelConfigCache.has(modelId)) {
        return;
      }
    }

    this.validateModelAvailability(modelId, availabilitySettings);
  }

  private toAiModelConfig(
    compositeId: string,
    providerConfig: AiProviderConfig,
    modelDef: AiProviderModelConfig,
  ): AiModelConfig {
    return {
      modelId: compositeId,
      label: modelDef.label,
      sdkPackage: providerConfig.npm,
      description: modelDef.description ?? compositeId,
      modelFamily:
        modelDef.modelFamily ??
        inferModelFamily(providerConfig.name ?? '', modelDef.name),
      dataResidency: providerConfig.dataResidency,
      inputCostPerMillionTokens: modelDef.inputCostPerMillionTokens ?? 0,
      outputCostPerMillionTokens: modelDef.outputCostPerMillionTokens ?? 0,
      cachedInputCostPerMillionTokens: modelDef.cachedInputCostPerMillionTokens,
      cacheCreationCostPerMillionTokens:
        modelDef.cacheCreationCostPerMillionTokens,
      longContextCost: modelDef.longContextCost,
      contextWindowTokens:
        modelDef.contextWindowTokens ?? DEFAULT_CONTEXT_WINDOW_TOKENS,
      maxOutputTokens: modelDef.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
      modalities: modelDef.modalities,
      supportsReasoning: modelDef.supportsReasoning,
      isDeprecated: modelDef.isDeprecated,
    };
  }

  getModel(modelId: string): RegisteredAiModel | undefined {
    this.ensureFresh();

    return this.modelRegistry.get(modelId);
  }

  getAvailableModels(): RegisteredAiModel[] {
    this.ensureFresh();

    return Array.from(this.modelRegistry.values());
  }

  getModelConfig(modelId: string): AiModelConfig | undefined {
    this.ensureFresh();

    return this.modelConfigCache.get(modelId);
  }

  getRecommendedModelIds(): Set<string> {
    return this.preferencesService.getRecommendedModelIds();
  }

  private getFirstAvailableModelFromList(
    modelIds: string[],
  ): RegisteredAiModel | undefined {
    for (const modelId of modelIds) {
      const model = this.getModel(modelId);

      if (model) {
        return model;
      }
    }

    return undefined;
  }

  getDefaultSpeedModel(): RegisteredAiModel {
    return this.getDefaultModelForRole(AiModelRole.FAST);
  }

  getDefaultPerformanceModel(): RegisteredAiModel {
    return this.getDefaultModelForRole(AiModelRole.SMART);
  }

  private getDefaultModelForRole(role: AiModelRole): RegisteredAiModel {
    const prefs = this.preferencesService.getPreferences();
    const preferenceKey =
      role === AiModelRole.FAST ? 'defaultFastModels' : 'defaultSmartModels';

    let model = this.getFirstAvailableModelFromList(prefs[preferenceKey] ?? []);

    if (!model) {
      model = this.getAvailableModels()[0];
    }

    if (!model) {
      throw new AiException(
        'No AI models are available. Configure at least one AI provider.',
        AiExceptionCode.API_KEY_NOT_CONFIGURED,
      );
    }

    return model;
  }

  getEffectiveModelConfig(modelId: string): AiModelConfig {
    this.ensureFresh();

    if (isAutoSelectModelId(modelId)) {
      const defaultModel =
        modelId === AUTO_SELECT_FAST_MODEL_ID
          ? this.getDefaultSpeedModel()
          : this.getDefaultPerformanceModel();

      return (
        this.modelConfigCache.get(defaultModel.modelId) ??
        this.createDefaultConfigForCustomModel(defaultModel)
      );
    }

    const config = this.modelConfigCache.get(modelId);

    if (config) {
      return config;
    }

    const registeredModel = this.getModel(modelId);

    if (registeredModel) {
      return this.createDefaultConfigForCustomModel(registeredModel);
    }

    throw new AiException(
      `Model with ID ${modelId} not found`,
      AiExceptionCode.AGENT_EXECUTION_FAILED,
    );
  }

  private createDefaultConfigForCustomModel(
    registeredModel: RegisteredAiModel,
  ): AiModelConfig {
    return {
      modelId: registeredModel.modelId,
      label: registeredModel.modelId,
      description: `Custom model: ${registeredModel.modelId}`,
      modelFamily: inferModelFamily(
        registeredModel.modelsDevName ?? '',
        registeredModel.modelId,
      ),
      sdkPackage: registeredModel.sdkPackage,
      inputCostPerMillionTokens: 0,
      outputCostPerMillionTokens: 0,
      contextWindowTokens: DEFAULT_CONTEXT_WINDOW_TOKENS,
      maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    };
  }

  isModelAdminAllowed(modelId: string): boolean {
    if (isAutoSelectModelId(modelId)) {
      return true;
    }

    const prefs = this.preferencesService.getPreferences();
    const disabledModels = prefs.disabledModels ?? [];

    return !disabledModels.includes(modelId);
  }

  validateModelAvailability(
    modelId: string,
    availabilitySettings: WorkspaceModelAvailabilitySettings,
  ): void {
    if (!this.isModelAdminAllowed(modelId)) {
      throw new AiException(
        'The selected model has been disabled by the administrator.',
        AiExceptionCode.AGENT_EXECUTION_FAILED,
      );
    }

    const recommendedModelIds = this.getRecommendedModelIds();

    const isAvailable = isAutoSelectModelId(modelId)
      ? workspaceHasEnabledModels(availabilitySettings, recommendedModelIds)
      : isModelAllowedByWorkspace(
          modelId,
          availabilitySettings,
          recommendedModelIds,
        );

    if (!isAvailable) {
      throw new AiException(
        'The selected model is not available in this workspace.',
        AiExceptionCode.AGENT_EXECUTION_FAILED,
      );
    }
  }

  getAdminFilteredModels(): RegisteredAiModel[] {
    return this.getAvailableModels().filter((model) =>
      this.isModelAdminAllowed(model.modelId),
    );
  }

  getAllModelsWithStatus(): Array<{
    modelConfig: AiModelConfig;
    isAvailable: boolean;
    isAdminEnabled: boolean;
    isRecommended: boolean;
    providerName?: string;
    name?: string;
  }> {
    this.ensureFresh();
    const recommended = this.getRecommendedModelIds();

    return Array.from(this.modelConfigCache.values()).map((modelConfig) => {
      const registered = this.modelRegistry.get(modelConfig.modelId);
      const cached = this.providerModelDefCache.get(modelConfig.modelId);

      return {
        modelConfig,
        isAvailable: !!registered,
        isAdminEnabled: this.isModelAdminAllowed(modelConfig.modelId),
        isRecommended: recommended.has(modelConfig.modelId),
        providerName: registered?.providerName ?? cached?.providerName,
        name: cached?.modelDef.name,
      };
    });
  }

  async setModelAdminEnabled(modelId: string, enabled: boolean): Promise<void> {
    this.validateModelInRegistry(modelId);
    await this.preferencesService.setModelAdminEnabled(modelId, enabled);
  }

  async setModelRecommended(
    modelId: string,
    recommended: boolean,
  ): Promise<void> {
    this.validateModelInRegistry(modelId);
    await this.preferencesService.setModelRecommended(modelId, recommended);
  }

  async setModelsAdminEnabled(
    modelIds: string[],
    enabled: boolean,
  ): Promise<void> {
    modelIds.forEach((id) => this.validateModelInRegistry(id));
    await this.preferencesService.setModelsAdminEnabled(modelIds, enabled);
  }

  async setModelsRecommended(
    modelIds: string[],
    recommended: boolean,
  ): Promise<void> {
    modelIds.forEach((id) => this.validateModelInRegistry(id));
    await this.preferencesService.setModelsRecommended(modelIds, recommended);
  }

  async setDefaultModel(role: AiModelRole, modelId: string): Promise<void> {
    this.validateModelInRegistry(modelId);
    await this.preferencesService.setDefaultModel(role, modelId);
  }

  private validateModelInRegistry(modelId: string): void {
    this.ensureFresh();

    if (!this.providerModelDefCache.has(modelId)) {
      throw new AiException(
        `Cannot update model "${modelId}": not found in registry`,
        AiExceptionCode.AGENT_EXECUTION_FAILED,
      );
    }
  }

  getResolvedProvidersForAdmin(): AiProvidersConfig {
    return this.providerConfigService.getResolvedProviders();
  }

  getCatalogProviderNames(): Set<string> {
    return this.providerConfigService.getCatalogProviderNames();
  }

  resolveModelForAgent(agent: { modelId: string } | null): RegisteredAiModel {
    const aiModel = this.getEffectiveModelConfig(
      agent?.modelId ?? AUTO_SELECT_SMART_MODEL_ID,
    );

    const registeredModel = this.getModel(aiModel.modelId);

    if (!registeredModel) {
      throw new AiException(
        `Model ${aiModel.modelId} not found in registry. Check that the corresponding AI provider is configured.`,
        AiExceptionCode.API_KEY_NOT_CONFIGURED,
      );
    }

    return registeredModel;
  }
}
