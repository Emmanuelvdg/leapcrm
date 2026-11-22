export type TranscriptionResponseSegment = {
  start?: number;
  end?: number;
  text?: string;
};

// Subset of the OpenAI `verbose_json` transcription response that Speaches,
// OpenAI and Groq all return.
export type TranscriptionResponse = {
  text?: string;
  segments?: TranscriptionResponseSegment[];
};
