import { getRecordingFileExtension } from '@/call-recording/utils/getRecordingFileExtension';

describe('getRecordingFileExtension', () => {
  it.each([
    ['audio/webm;codecs=opus', 'webm'],
    ['audio/webm', 'webm'],
    ['audio/mp4', 'm4a'],
    ['audio/ogg;codecs=opus', 'ogg'],
  ])('names a %s recording .%s', (mimeType, extension) => {
    expect(getRecordingFileExtension(mimeType)).toBe(extension);
  });
});
