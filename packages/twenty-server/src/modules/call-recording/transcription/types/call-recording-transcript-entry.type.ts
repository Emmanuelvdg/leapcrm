type CallRecordingTranscriptTimestamp = { relative: number };

export type CallRecordingTranscriptWord = {
  text: string;
  start_timestamp?: CallRecordingTranscriptTimestamp;
  end_timestamp?: CallRecordingTranscriptTimestamp;
};

// Same raw shape the call recorder app stores, so the existing transcript
// widget parses both.
export type CallRecordingTranscriptEntry = {
  participant: { name?: string };
  words: CallRecordingTranscriptWord[];
};
