export const getRecordingFileExtension = (mimeType: string): string => {
  const baseType = mimeType.split(';')[0].trim();

  if (baseType === 'audio/mp4' || baseType === 'video/mp4') {
    return 'm4a';
  }

  if (baseType === 'audio/ogg') {
    return 'ogg';
  }

  return 'webm';
};
