import { generateText } from 'ai';

import { type BillingUsageService } from 'src/engine/core-modules/billing/services/billing-usage.service';
import { UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import { type AiBillingService } from 'src/engine/metadata-modules/ai/ai-billing/services/ai-billing.service';
import { type AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';
import { CALL_RECORDING_SUMMARY_PROMPT } from 'src/modules/call-recording/transcription/constants/call-recording-summary-prompt.constant';
import { CallRecordingSummaryService } from 'src/modules/call-recording/transcription/services/call-recording-summary.service';

jest.mock('ai', () => ({ generateText: jest.fn() }));

jest.mock(
  'src/engine/core-modules/record-transformer/utils/transform-rich-text.util',
  () => ({
    transformRichTextValue: jest.fn(
      async ({ markdown }: { markdown: string }) => ({
        blocknote: '[converted]',
        markdown,
      }),
    ),
  }),
);

const WORKSPACE_ID = '0b0f1f55-5d55-4f26-9e1c-6f0f1b8f4a01';

const TRANSCRIPT = [
  {
    participant: {},
    words: [
      {
        text: 'Please send the quote for 20 seats.',
        start_timestamp: { relative: 0 },
        end_timestamp: { relative: 3 },
      },
    ],
  },
  {
    participant: {},
    words: [
      {
        text: 'Our budget is around $80,000.',
        start_timestamp: { relative: 65 },
        end_timestamp: { relative: 68 },
      },
    ],
  },
];

const setup = ({
  resolveModel = jest.fn().mockResolvedValue({
    modelId: 'fast-model',
    model: 'fast-model-instance',
  }),
  hasAvailableCreditsOrThrow = jest.fn().mockResolvedValue(undefined),
} = {}) => {
  const calculateAndBillUsage = jest.fn().mockResolvedValue(undefined);

  const service = new CallRecordingSummaryService(
    {
      resolveModelForAgentForWorkspace: resolveModel,
    } as unknown as AiModelRegistryService,
    { calculateAndBillUsage } as unknown as AiBillingService,
    { hasAvailableCreditsOrThrow } as unknown as BillingUsageService,
  );

  return { service, calculateAndBillUsage, resolveModel };
};

describe('CallRecordingSummaryService', () => {
  beforeEach(() => {
    jest.mocked(generateText).mockReset();
  });

  it('writes a summary from the timestamped transcript and bills the tokens', async () => {
    const { service, calculateAndBillUsage } = setup();

    jest.mocked(generateText).mockResolvedValue({
      text: '## Summary\nThey asked for a quote for 20 seats.\n',
      usage: { inputTokens: 120, outputTokens: 40, totalTokens: 160 },
      steps: [],
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    const summary = await service.summarize({
      workspaceId: WORKSPACE_ID,
      transcript: TRANSCRIPT,
    });

    expect(summary).toEqual({
      blocknote: '[converted]',
      markdown: '## Summary\nThey asked for a quote for 20 seats.',
    });
    expect(jest.mocked(generateText)).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'fast-model-instance',
        system: CALL_RECORDING_SUMMARY_PROMPT,
        prompt:
          '[00:00] Please send the quote for 20 seats.\n[01:05] Our budget is around $80,000.',
      }),
    );
    expect(calculateAndBillUsage).toHaveBeenCalledWith(
      'fast-model',
      expect.objectContaining({ cacheCreationTokens: 0 }),
      WORKSPACE_ID,
      UsageOperationType.AI_WORKFLOW_TOKEN,
      null,
      null,
    );
  });

  it('skips the summary when the workspace has no AI model', async () => {
    const { service } = setup({
      resolveModel: jest
        .fn()
        .mockRejectedValue(new Error('No AI provider configured')),
    });

    await expect(
      service.summarize({ workspaceId: WORKSPACE_ID, transcript: TRANSCRIPT }),
    ).resolves.toBeNull();
    expect(jest.mocked(generateText)).not.toHaveBeenCalled();
  });

  it('skips the summary when the workspace is out of AI credits', async () => {
    const { service, resolveModel } = setup({
      hasAvailableCreditsOrThrow: jest
        .fn()
        .mockRejectedValue(new Error('No credits left')),
    });

    await expect(
      service.summarize({ workspaceId: WORKSPACE_ID, transcript: TRANSCRIPT }),
    ).resolves.toBeNull();
    expect(resolveModel).not.toHaveBeenCalled();
  });

  it('does not call the model for an empty transcript', async () => {
    const { service } = setup();

    await expect(
      service.summarize({ workspaceId: WORKSPACE_ID, transcript: [] }),
    ).resolves.toBeNull();
    expect(jest.mocked(generateText)).not.toHaveBeenCalled();
  });
});
