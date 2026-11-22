import { Injectable, Logger } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { isAxiosError } from 'axios';
import { FileFolder } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type FileOutput } from 'src/engine/api/common/common-args-processors/data-arg-processor/types/file-item.type';
import { FileService } from 'src/engine/core-modules/file/services/file.service';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { type RolePermissionConfig } from 'src/engine/twenty-orm/types/role-permission-config';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { CallRecordingStatus } from 'src/modules/call-recording/common/enums/call-recording-status.enum';
import { CallRecordingWorkspaceEntity } from 'src/modules/call-recording/standard-objects/call-recording.workspace-entity';
import { CALL_RECORDING_TRANSCRIPTION_TIMEOUT_MS } from 'src/modules/call-recording/transcription/constants/call-recording-transcription-timeout.constant';
import { type CallRecordingTranscriptEntry } from 'src/modules/call-recording/transcription/types/call-recording-transcript-entry.type';
import { type TranscriptionResponse } from 'src/modules/call-recording/transcription/types/transcription-response.type';
import { isCallRecordingAwaitingTranscription } from 'src/modules/call-recording/transcription/utils/is-call-recording-awaiting-transcription.util';
import { mapTranscriptionResponseToTranscript } from 'src/modules/call-recording/transcription/utils/map-transcription-response-to-transcript.util';

const SYSTEM_PERMISSIONS: RolePermissionConfig = {
  shouldBypassPermissionChecks: true,
};

class CallRecordingTranscriptionError extends Error {}

const isModelNotInstalledError = (error: unknown): boolean => {
  if (!isAxiosError(error) || error.response?.status !== 404) {
    return false;
  }

  const detail = (error.response.data as { detail?: unknown } | undefined)
    ?.detail;

  return isNonEmptyString(detail) && detail.includes('not installed');
};

@Injectable()
export class CallRecordingTranscriptionService {
  private readonly logger = new Logger(CallRecordingTranscriptionService.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly fileService: FileService,
    private readonly secureHttpClientService: SecureHttpClientService,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  async transcribe({
    workspaceId,
    callRecordingId,
  }: {
    workspaceId: string;
    callRecordingId: string;
  }): Promise<void> {
    const callRecording = await this.withRepository(workspaceId, (repository) =>
      repository.findOne({ where: { id: callRecordingId } }),
    );

    if (
      !isDefined(callRecording) ||
      !isCallRecordingAwaitingTranscription(callRecording) ||
      !isDefined(callRecording.audio?.[0])
    ) {
      return;
    }

    try {
      const transcript = await this.requestTranscript({
        workspaceId,
        audio: callRecording.audio[0],
      });

      await this.withRepository(workspaceId, (repository) =>
        repository.update(
          { id: callRecordingId },
          { transcript, status: CallRecordingStatus.COMPLETED },
        ),
      );
    } catch (error) {
      const reason = this.describeError(error);

      this.logger.warn(
        `Transcription failed for call recording ${callRecordingId} in workspace ${workspaceId}: ${reason}`,
      );

      await this.withRepository(workspaceId, (repository) =>
        repository.update(
          { id: callRecordingId },
          {
            transcript: { status: 'FAILED', reason },
            status: CallRecordingStatus.FAILED,
          },
        ),
      );
    }
  }

  private async requestTranscript({
    workspaceId,
    audio,
  }: {
    workspaceId: string;
    audio: FileOutput;
  }): Promise<CallRecordingTranscriptEntry[]> {
    const apiUrl = this.twentyConfigService.get('TRANSCRIPTION_API_URL');

    if (!isNonEmptyString(apiUrl)) {
      throw new CallRecordingTranscriptionError(
        'Transcription is not configured on this server',
      );
    }

    const file = await this.fileService.getFileContentById({
      fileId: audio.fileId,
      workspaceId,
      fileFolder: FileFolder.FilesField,
    });

    if (!isDefined(file)) {
      throw new CallRecordingTranscriptionError(
        'The recording file could not be found',
      );
    }

    const model = this.twentyConfigService.get('TRANSCRIPTION_MODEL');
    const formData = new FormData();

    formData.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }),
      isNonEmptyString(audio.label) ? audio.label : 'recording',
    );
    formData.append('model', model);
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');

    const apiKey = this.twentyConfigService.get('TRANSCRIPTION_API_KEY');
    const baseUrl = apiUrl.replace(/\/+$/, '');
    const requestConfig = {
      headers: isNonEmptyString(apiKey)
        ? { Authorization: `Bearer ${apiKey}` }
        : undefined,
      timeout: CALL_RECORDING_TRANSCRIPTION_TIMEOUT_MS,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    };

    // The URL comes from server config, not from users, and usually points
    // at a container on the internal Docker network.
    const httpClient = this.secureHttpClientService.getInternalHttpClient();

    const postTranscription = () =>
      httpClient.post<TranscriptionResponse>(
        `${baseUrl}/audio/transcriptions`,
        formData,
        requestConfig,
      );

    try {
      const response = await postTranscription();

      return mapTranscriptionResponseToTranscript(response.data);
    } catch (error) {
      if (!isModelNotInstalledError(error)) {
        throw error;
      }
    }

    // A fresh self-hosted Speaches has no models until one is requested.
    this.logger.log(`Downloading transcription model ${model}`);
    await httpClient.post(
      `${baseUrl}/models/${model}`,
      undefined,
      requestConfig,
    );

    const response = await postTranscription();

    return mapTranscriptionResponseToTranscript(response.data);
  }

  private describeError(error: unknown): string {
    if (error instanceof CallRecordingTranscriptionError) {
      return error.message;
    }

    if (isAxiosError(error)) {
      const status = error.response?.status;

      return isDefined(status)
        ? `The transcription service returned HTTP ${status}`
        : 'The transcription service could not be reached';
    }

    return 'Transcription failed';
  }

  private async withRepository<TResult>(
    workspaceId: string,
    callback: (
      repository: WorkspaceRepository<CallRecordingWorkspaceEntity>,
    ) => Promise<TResult>,
  ): Promise<TResult> {
    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const repository = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          CallRecordingWorkspaceEntity,
          SYSTEM_PERMISSIONS,
        );

        return callback(repository);
      },
      buildSystemAuthContext(workspaceId),
    );
  }
}
