import { isDefined } from 'twenty-shared/utils';

import { type CallRecordingTranscriptEntry } from 'src/modules/call-recording/transcription/types/call-recording-transcript-entry.type';

const formatTimestamp = (seconds: number) => {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);

  return `${minutes.toString().padStart(2, '0')}:${(wholeSeconds % 60)
    .toString()
    .padStart(2, '0')}`;
};

export const formatTranscriptForSummary = (
  entries: CallRecordingTranscriptEntry[],
): string =>
  entries
    .map((entry) => {
      const text = entry.words
        .map((word) => word.text)
        .join(' ')
        .trim();
      const startSeconds = entry.words[0]?.start_timestamp?.relative;

      return isDefined(startSeconds)
        ? `[${formatTimestamp(startSeconds)}] ${text}`
        : text;
    })
    .filter((line) => line.length > 0)
    .join('\n');
