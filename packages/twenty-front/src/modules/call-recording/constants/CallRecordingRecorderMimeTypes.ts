// Ordered by preference: Chrome and Firefox record WebM/Opus, Safari MP4.
export const CALL_RECORDING_RECORDER_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
] as const;
