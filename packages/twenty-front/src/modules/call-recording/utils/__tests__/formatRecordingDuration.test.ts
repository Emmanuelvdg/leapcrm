import { formatRecordingDuration } from '@/call-recording/utils/formatRecordingDuration';

describe('formatRecordingDuration', () => {
  it('shows minutes and seconds for short recordings', () => {
    expect(formatRecordingDuration(0)).toBe('00:00');
    expect(formatRecordingDuration(75.9)).toBe('01:15');
  });

  it('adds hours for long meetings', () => {
    expect(formatRecordingDuration(3 * 3600 + 5 * 60 + 9)).toBe('3:05:09');
  });
});
