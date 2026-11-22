import { CALL_RECORDING_RECORDER_MIME_TYPES } from '@/call-recording/constants/CallRecordingRecorderMimeTypes';

export const getSupportedRecorderMimeType = (
  isTypeSupported: (mimeType: string) => boolean,
): string | undefined =>
  CALL_RECORDING_RECORDER_MIME_TYPES.find((mimeType) =>
    isTypeSupported(mimeType),
  );
