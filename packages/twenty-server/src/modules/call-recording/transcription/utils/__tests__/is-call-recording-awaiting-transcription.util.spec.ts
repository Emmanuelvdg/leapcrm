import { CallRecordingStatus } from 'src/modules/call-recording/common/enums/call-recording-status.enum';
import { isCallRecordingAwaitingTranscription } from 'src/modules/call-recording/transcription/utils/is-call-recording-awaiting-transcription.util';

const IN_APP_RECORDING = {
  audio: [
    {
      fileId: '6b1d5a7e-4f7d-4b8b-9a51-2f6f0c1d9e11',
      label: 'meeting.webm',
      extension: 'webm',
    },
  ],
  externalBotId: null,
  status: CallRecordingStatus.PROCESSING,
  transcript: { status: 'PENDING' },
};

describe('isCallRecordingAwaitingTranscription', () => {
  it('picks up an in-app recording with audio and a pending transcript', () => {
    expect(isCallRecordingAwaitingTranscription(IN_APP_RECORDING)).toBe(true);
  });

  it('ignores recordings made by a meeting bot', () => {
    expect(
      isCallRecordingAwaitingTranscription({
        ...IN_APP_RECORDING,
        externalBotId: 'bot-123',
      }),
    ).toBe(false);
  });

  it('treats an empty bot id as an in-app recording', () => {
    expect(
      isCallRecordingAwaitingTranscription({
        ...IN_APP_RECORDING,
        externalBotId: '',
      }),
    ).toBe(true);
  });

  it('ignores recordings without audio', () => {
    expect(
      isCallRecordingAwaitingTranscription({ ...IN_APP_RECORDING, audio: [] }),
    ).toBe(false);
  });

  it('ignores recordings that already have a transcript or failed', () => {
    expect(
      isCallRecordingAwaitingTranscription({
        ...IN_APP_RECORDING,
        status: CallRecordingStatus.COMPLETED,
        transcript: [{ participant: {}, words: [{ text: 'Hi' }] }],
      }),
    ).toBe(false);
    expect(
      isCallRecordingAwaitingTranscription({
        ...IN_APP_RECORDING,
        status: CallRecordingStatus.FAILED,
        transcript: { status: 'FAILED' },
      }),
    ).toBe(false);
  });

  it('ignores missing records', () => {
    expect(isCallRecordingAwaitingTranscription(undefined)).toBe(false);
  });
});
