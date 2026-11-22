import { Injectable } from '@nestjs/common';

import {
  type ObjectRecordCreateEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { type CallRecordingWorkspaceEntity } from 'src/modules/call-recording/standard-objects/call-recording.workspace-entity';
import {
  TranscribeCallRecordingJob,
  type TranscribeCallRecordingJobData,
} from 'src/modules/call-recording/transcription/jobs/transcribe-call-recording.job';
import { isCallRecordingAwaitingTranscription } from 'src/modules/call-recording/transcription/utils/is-call-recording-awaiting-transcription.util';

// Registered in the API server and the worker, because database events are
// only seen by the process that made the write.
@Injectable()
export class CallRecordingTranscriptionListener {
  constructor(
    @InjectMessageQueue(MessageQueue.callRecordingQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  @OnDatabaseBatchEvent('callRecording', DatabaseEventAction.CREATED)
  async handleCallRecordingCreated(
    payload: WorkspaceEventBatch<
      ObjectRecordCreateEvent<CallRecordingWorkspaceEntity>
    >,
  ): Promise<void> {
    await this.enqueue(
      payload.workspaceId,
      payload.events
        .filter((event) =>
          isCallRecordingAwaitingTranscription(event.properties.after),
        )
        .map((event) => event.recordId),
    );
  }

  @OnDatabaseBatchEvent('callRecording', DatabaseEventAction.UPDATED)
  async handleCallRecordingUpdated(
    payload: WorkspaceEventBatch<
      ObjectRecordUpdateEvent<CallRecordingWorkspaceEntity>
    >,
  ): Promise<void> {
    await this.enqueue(
      payload.workspaceId,
      payload.events
        .filter(
          (event) =>
            !isCallRecordingAwaitingTranscription(event.properties.before) &&
            isCallRecordingAwaitingTranscription(event.properties.after),
        )
        .map((event) => event.recordId),
    );
  }

  private async enqueue(
    workspaceId: string,
    callRecordingIds: string[],
  ): Promise<void> {
    for (const callRecordingId of callRecordingIds) {
      await this.messageQueueService.add<TranscribeCallRecordingJobData>(
        TranscribeCallRecordingJob.name,
        { workspaceId, callRecordingId },
      );
    }
  }
}
