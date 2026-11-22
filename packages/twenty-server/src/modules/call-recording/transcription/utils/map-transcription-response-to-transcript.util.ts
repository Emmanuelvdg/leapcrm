import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { type CallRecordingTranscriptEntry } from 'src/modules/call-recording/transcription/types/call-recording-transcript-entry.type';
import {
  type TranscriptionResponse,
  type TranscriptionResponseSegment,
} from 'src/modules/call-recording/transcription/types/transcription-response.type';

const toTimestamp = (seconds: number | undefined) =>
  isDefined(seconds) && Number.isFinite(seconds)
    ? { relative: seconds }
    : undefined;

const mapSegment = (
  segment: TranscriptionResponseSegment,
): CallRecordingTranscriptEntry | null => {
  const text = segment.text?.trim();

  if (!isNonEmptyString(text)) {
    return null;
  }

  return {
    participant: {},
    words: [
      {
        text,
        start_timestamp: toTimestamp(segment.start),
        end_timestamp: toTimestamp(segment.end),
      },
    ],
  };
};

export const mapTranscriptionResponseToTranscript = (
  response: TranscriptionResponse,
): CallRecordingTranscriptEntry[] => {
  const entries = (response.segments ?? []).map(mapSegment).filter(isDefined);

  if (entries.length > 0) {
    return entries;
  }

  const fallbackEntry = mapSegment({ text: response.text });

  return isDefined(fallbackEntry) ? [fallbackEntry] : [];
};
