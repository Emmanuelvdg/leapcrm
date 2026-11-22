import { getSupportedRecorderMimeType } from '@/call-recording/utils/getSupportedRecorderMimeType';

describe('getSupportedRecorderMimeType', () => {
  it('prefers WebM with Opus when the browser supports it', () => {
    expect(getSupportedRecorderMimeType(() => true)).toBe(
      'audio/webm;codecs=opus',
    );
  });

  it('falls back to MP4 on browsers that only record MP4', () => {
    expect(
      getSupportedRecorderMimeType((mimeType) => mimeType === 'audio/mp4'),
    ).toBe('audio/mp4');
  });

  it('returns undefined when no format is supported', () => {
    expect(getSupportedRecorderMimeType(() => false)).toBeUndefined();
  });
});
