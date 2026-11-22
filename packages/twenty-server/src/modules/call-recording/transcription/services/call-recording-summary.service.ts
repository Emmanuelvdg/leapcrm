import { Injectable, Logger } from '@nestjs/common';

import { generateText, type LanguageModelUsage } from 'ai';
import { AUTO_SELECT_FAST_MODEL_ID } from 'twenty-shared/constants';
import { type RichTextMetadata } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { BillingUsageService } from 'src/engine/core-modules/billing/services/billing-usage.service';
import { transformRichTextValue } from 'src/engine/core-modules/record-transformer/utils/transform-rich-text.util';
import { UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import { AiBillingService } from 'src/engine/metadata-modules/ai/ai-billing/services/ai-billing.service';
import { extractCacheCreationTokensFromSteps } from 'src/engine/metadata-modules/ai/ai-billing/utils/extract-cache-creation-tokens.util';
import { AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';
import { buildAiTelemetry } from 'src/engine/metadata-modules/ai/ai-models/utils/build-ai-telemetry.util';
import { CALL_RECORDING_SUMMARY_PROMPT } from 'src/modules/call-recording/transcription/constants/call-recording-summary-prompt.constant';
import { type CallRecordingTranscriptEntry } from 'src/modules/call-recording/transcription/types/call-recording-transcript-entry.type';
import { formatTranscriptForSummary } from 'src/modules/call-recording/transcription/utils/format-transcript-for-summary.util';

@Injectable()
export class CallRecordingSummaryService {
  private readonly logger = new Logger(CallRecordingSummaryService.name);

  constructor(
    private readonly aiModelRegistryService: AiModelRegistryService,
    private readonly aiBillingService: AiBillingService,
    private readonly billingUsageService: BillingUsageService,
  ) {}

  // A missing AI model or a failed call leaves the recording without a
  // summary instead of failing it, since the transcript is already saved.
  async summarize({
    workspaceId,
    transcript,
  }: {
    workspaceId: string;
    transcript: CallRecordingTranscriptEntry[];
  }): Promise<RichTextMetadata | null> {
    const transcriptText = formatTranscriptForSummary(transcript);

    if (transcriptText.length === 0) {
      return null;
    }

    try {
      await this.billingUsageService.hasAvailableCreditsOrThrow(workspaceId);

      const registeredModel =
        await this.aiModelRegistryService.resolveModelForAgentForWorkspace(
          { modelId: AUTO_SELECT_FAST_MODEL_ID },
          workspaceId,
        );

      const result = await generateText({
        model: registeredModel.model,
        system: CALL_RECORDING_SUMMARY_PROMPT,
        prompt: transcriptText,
        experimental_telemetry: buildAiTelemetry({
          functionId: 'call-recording-summary',
          workspaceId,
          userWorkspaceId: null,
        }),
      });

      this.billUsage({
        modelId: registeredModel.modelId,
        usage: result.usage,
        cacheCreationTokens: extractCacheCreationTokensFromSteps(result.steps),
        workspaceId,
      });

      const markdown = result.text.trim();

      if (markdown.length === 0) {
        return null;
      }

      return await transformRichTextValue({ blocknote: null, markdown });
    } catch (error) {
      this.logger.warn(
        `Could not summarize a call recording in workspace ${workspaceId}: ${error instanceof Error ? error.message : String(error)}`,
      );

      return null;
    }
  }

  private billUsage({
    modelId,
    usage,
    cacheCreationTokens,
    workspaceId,
  }: {
    modelId: string;
    usage: LanguageModelUsage | undefined;
    cacheCreationTokens: number;
    workspaceId: string;
  }) {
    if (!isDefined(usage)) {
      return;
    }

    void this.aiBillingService.calculateAndBillUsage(
      modelId,
      { usage, cacheCreationTokens },
      workspaceId,
      UsageOperationType.AI_WORKFLOW_TOKEN,
      null,
      null,
    );
  }
}
