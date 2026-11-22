import { AxiosError, type AxiosResponse } from 'axios';
import { type RichTextMetadata } from 'twenty-shared/types';

import { type FileService } from 'src/engine/core-modules/file/services/file.service';
import { type SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { CallRecordingStatus } from 'src/modules/call-recording/common/enums/call-recording-status.enum';
import { type CallRecordingSummaryService } from 'src/modules/call-recording/transcription/services/call-recording-summary.service';
import { CallRecordingTranscriptionService } from 'src/modules/call-recording/transcription/services/call-recording-transcription.service';

const WORKSPACE_ID = '0b0f1f55-5d55-4f26-9e1c-6f0f1b8f4a01';
const CALL_RECORDING_ID = '3c1f2a8e-7f3a-4f43-8a0a-2a1b3c4d5e6f';

const buildPendingRecording = () => ({
  id: CALL_RECORDING_ID,
  audio: [
    {
      fileId: '6b1d5a7e-4f7d-4b8b-9a51-2f6f0c1d9e11',
      label: 'meeting.webm',
      extension: 'webm',
    },
  ],
  externalBotId: null,
  status: CallRecordingStatus.PROCESSING,
  transcript: { status: 'PENDING' },
});

const setup = ({
  config = {
    TRANSCRIPTION_API_URL: 'http://speaches:8000/v1/',
    TRANSCRIPTION_API_KEY: undefined,
    TRANSCRIPTION_MODEL: 'Systran/faster-whisper-small',
  } as Record<string, string | undefined>,
  recording = buildPendingRecording() as Record<string, unknown> | null,
  summary = null as RichTextMetadata | null,
} = {}) => {
  const repository = {
    findOne: jest.fn().mockResolvedValue(recording),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const globalWorkspaceOrmManager = {
    executeInWorkspaceContext: jest.fn((callback: () => unknown) => callback()),
    getRepository: jest.fn().mockResolvedValue(repository),
  } as unknown as GlobalWorkspaceOrmManager;
  const fileService = {
    getFileContentById: jest.fn().mockResolvedValue({
      buffer: Buffer.from('audio-bytes'),
      mimeType: 'audio/webm',
    }),
  } as unknown as FileService;
  const post = jest.fn();
  const secureHttpClientService = {
    getInternalHttpClient: jest.fn(() => ({ post })),
  } as unknown as SecureHttpClientService;
  const twentyConfigService = {
    get: jest.fn((key: string) => config[key]),
  } as unknown as TwentyConfigService;
  const summarize = jest.fn().mockResolvedValue(summary);
  const callRecordingSummaryService = {
    summarize,
  } as unknown as CallRecordingSummaryService;

  const service = new CallRecordingTranscriptionService(
    globalWorkspaceOrmManager,
    fileService,
    secureHttpClientService,
    twentyConfigService,
    callRecordingSummaryService,
  );

  return { service, repository, post, fileService, summarize };
};

describe('CallRecordingTranscriptionService', () => {
  it('saves the transcript, then the summary, and completes the recording', async () => {
    const summary = {
      blocknote: '[]',
      markdown: '## Summary\nThey asked for a quote.',
    };
    const { service, repository, post, summarize } = setup({ summary });

    post.mockResolvedValue({
      data: {
        text: 'Budget is around 80k.',
        segments: [{ start: 0, end: 2.5, text: ' Budget is around 80k.' }],
      },
    } as AxiosResponse);

    await service.transcribe({
      workspaceId: WORKSPACE_ID,
      callRecordingId: CALL_RECORDING_ID,
    });

    const [url, formData, options] = post.mock.calls[0];

    expect(url).toBe('http://speaches:8000/v1/audio/transcriptions');
    expect((formData as FormData).get('model')).toBe(
      'Systran/faster-whisper-small',
    );
    expect((formData as FormData).get('response_format')).toBe('verbose_json');
    expect(options.headers).toBeUndefined();

    const transcript = [
      {
        participant: {},
        words: [
          {
            text: 'Budget is around 80k.',
            start_timestamp: { relative: 0 },
            end_timestamp: { relative: 2.5 },
          },
        ],
      },
    ];

    expect(repository.update.mock.calls).toEqual([
      [{ id: CALL_RECORDING_ID }, { transcript }],
      [
        { id: CALL_RECORDING_ID },
        { summary, status: CallRecordingStatus.COMPLETED },
      ],
    ]);
    expect(summarize).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      transcript,
    });
  });

  it('completes the recording without a summary when none could be written', async () => {
    const { service, repository, post } = setup({ summary: null });

    post.mockResolvedValue({
      data: { segments: [{ start: 0, end: 1, text: ' Hello.' }] },
    } as AxiosResponse);

    await service.transcribe({
      workspaceId: WORKSPACE_ID,
      callRecordingId: CALL_RECORDING_ID,
    });

    expect(repository.update).toHaveBeenLastCalledWith(
      { id: CALL_RECORDING_ID },
      { status: CallRecordingStatus.COMPLETED },
    );
  });

  it('sends the API key when one is configured', async () => {
    const { service, post } = setup({
      config: {
        TRANSCRIPTION_API_URL: 'https://api.openai.com/v1',
        TRANSCRIPTION_API_KEY: 'test-key',
        TRANSCRIPTION_MODEL: 'whisper-1',
      },
    });

    post.mockResolvedValue({ data: { segments: [] } } as AxiosResponse);

    await service.transcribe({
      workspaceId: WORKSPACE_ID,
      callRecordingId: CALL_RECORDING_ID,
    });

    expect(post.mock.calls[0][2].headers).toEqual({
      Authorization: 'Bearer test-key',
    });
  });

  it('fails the recording with a clear reason when transcription is not configured', async () => {
    const { service, repository, post } = setup({
      config: { TRANSCRIPTION_MODEL: 'Systran/faster-whisper-small' },
    });

    await service.transcribe({
      workspaceId: WORKSPACE_ID,
      callRecordingId: CALL_RECORDING_ID,
    });

    expect(post).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(
      { id: CALL_RECORDING_ID },
      {
        status: CallRecordingStatus.FAILED,
        transcript: {
          status: 'FAILED',
          reason: 'Transcription is not configured on this server',
        },
      },
    );
  });

  it('fails the recording when the transcription service errors', async () => {
    const { service, repository, post } = setup();

    post.mockRejectedValue(
      new AxiosError('boom', undefined, undefined, undefined, {
        status: 500,
      } as AxiosResponse),
    );

    await service.transcribe({
      workspaceId: WORKSPACE_ID,
      callRecordingId: CALL_RECORDING_ID,
    });

    expect(repository.update).toHaveBeenCalledWith(
      { id: CALL_RECORDING_ID },
      {
        status: CallRecordingStatus.FAILED,
        transcript: {
          status: 'FAILED',
          reason: 'The transcription service returned HTTP 500',
        },
      },
    );
  });

  it('downloads the model on a fresh Speaches install and retries', async () => {
    const { service, repository, post } = setup();

    post
      .mockRejectedValueOnce(
        new AxiosError('not installed', undefined, undefined, undefined, {
          status: 404,
          data: {
            detail:
              "Model 'Systran/faster-whisper-small' is not installed locally.",
          },
        } as AxiosResponse),
      )
      .mockResolvedValueOnce({ data: 'downloaded' } as AxiosResponse)
      .mockResolvedValueOnce({
        data: { segments: [{ start: 0, end: 1, text: ' Hello.' }] },
      } as AxiosResponse);

    await service.transcribe({
      workspaceId: WORKSPACE_ID,
      callRecordingId: CALL_RECORDING_ID,
    });

    expect(post.mock.calls.map(([url]) => url)).toEqual([
      'http://speaches:8000/v1/audio/transcriptions',
      'http://speaches:8000/v1/models/Systran/faster-whisper-small',
      'http://speaches:8000/v1/audio/transcriptions',
    ]);
    expect(repository.update).toHaveBeenCalledWith(
      { id: CALL_RECORDING_ID },
      expect.objectContaining({ status: CallRecordingStatus.COMPLETED }),
    );
  });

  it('leaves recordings that are not waiting for a transcript alone', async () => {
    const { service, repository, post } = setup({
      recording: {
        ...buildPendingRecording(),
        externalBotId: 'bot-123',
      },
    });

    await service.transcribe({
      workspaceId: WORKSPACE_ID,
      callRecordingId: CALL_RECORDING_ID,
    });

    expect(post).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });
});
