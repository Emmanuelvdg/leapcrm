import { Module } from '@nestjs/common';

import { BillingModule } from 'src/engine/core-modules/billing/billing.module';
import { FileModule } from 'src/engine/core-modules/file/file.module';
import { SecureHttpClientModule } from 'src/engine/core-modules/secure-http-client/secure-http-client.module';
import { AiBillingModule } from 'src/engine/metadata-modules/ai/ai-billing/ai-billing.module';
import { TranscribeCallRecordingJob } from 'src/modules/call-recording/transcription/jobs/transcribe-call-recording.job';
import { CallRecordingTranscriptionListener } from 'src/modules/call-recording/transcription/listeners/call-recording-transcription.listener';
import { CallRecordingSummaryService } from 'src/modules/call-recording/transcription/services/call-recording-summary.service';
import { CallRecordingTranscriptionService } from 'src/modules/call-recording/transcription/services/call-recording-transcription.service';

@Module({
  imports: [AiBillingModule, BillingModule, FileModule, SecureHttpClientModule],
  providers: [
    CallRecordingSummaryService,
    CallRecordingTranscriptionService,
    CallRecordingTranscriptionListener,
    TranscribeCallRecordingJob,
  ],
})
export class CallRecordingTranscriptionModule {}
