import { Injectable } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { CallRecordingTranscriptionService } from 'src/modules/call-recording/transcription/services/call-recording-transcription.service';

export type TranscribeCallRecordingJobData = {
  workspaceId: string;
  callRecordingId: string;
};

@Injectable()
@Processor(MessageQueue.callRecordingQueue)
export class TranscribeCallRecordingJob {
  constructor(
    private readonly callRecordingTranscriptionService: CallRecordingTranscriptionService,
  ) {}

  @Process(TranscribeCallRecordingJob.name)
  async handle(data: TranscribeCallRecordingJobData): Promise<void> {
    await this.callRecordingTranscriptionService.transcribe(data);
  }
}
