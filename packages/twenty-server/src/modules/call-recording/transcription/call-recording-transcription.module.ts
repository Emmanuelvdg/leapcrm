import { Module } from '@nestjs/common';

import { FileModule } from 'src/engine/core-modules/file/file.module';
import { SecureHttpClientModule } from 'src/engine/core-modules/secure-http-client/secure-http-client.module';
import { TranscribeCallRecordingJob } from 'src/modules/call-recording/transcription/jobs/transcribe-call-recording.job';
import { CallRecordingTranscriptionListener } from 'src/modules/call-recording/transcription/listeners/call-recording-transcription.listener';
import { CallRecordingTranscriptionService } from 'src/modules/call-recording/transcription/services/call-recording-transcription.service';

@Module({
  imports: [FileModule, SecureHttpClientModule],
  providers: [
    CallRecordingTranscriptionService,
    CallRecordingTranscriptionListener,
    TranscribeCallRecordingJob,
  ],
})
export class CallRecordingTranscriptionModule {}
