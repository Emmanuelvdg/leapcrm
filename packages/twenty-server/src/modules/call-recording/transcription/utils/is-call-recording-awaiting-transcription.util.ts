import { isNonEmptyString } from '@sniptt/guards';
import {
  isCallRecordingTranscriptStatusMarker,
  isDefined,
  isNonEmptyArray,
} from 'twenty-shared/utils';

import { CallRecordingStatus } from 'src/modules/call-recording/common/enums/call-recording-status.enum';
import { type CallRecordingWorkspaceEntity } from 'src/modules/call-recording/standard-objects/call-recording.workspace-entity';

type CallRecordingTranscriptionCandidate = Partial<
  Pick<
    CallRecordingWorkspaceEntity,
    'audio' | 'externalBotId' | 'status' | 'transcript'
  >
>;

// Recordings made by a meeting bot carry an externalBotId and get their
// transcript from the bot provider, so only in-app recordings are picked up.
// Empty text fields come back as '' rather than null.
export const isCallRecordingAwaitingTranscription = (
  callRecording: CallRecordingTranscriptionCandidate | null | undefined,
): boolean => {
  if (!isDefined(callRecording)) {
    return false;
  }

  return (
    isNonEmptyArray(callRecording.audio) &&
    !isNonEmptyString(callRecording.externalBotId) &&
    callRecording.status === CallRecordingStatus.PROCESSING &&
    isCallRecordingTranscriptStatusMarker(callRecording.transcript) &&
    callRecording.transcript.status === 'PENDING'
  );
};
