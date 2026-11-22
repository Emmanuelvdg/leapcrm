import { parseCallRecordingTranscriptEntries } from 'twenty-shared/utils';

import { mapTranscriptionResponseToTranscript } from 'src/modules/call-recording/transcription/utils/map-transcription-response-to-transcript.util';

describe('mapTranscriptionResponseToTranscript', () => {
  it('turns each spoken segment into a timed transcript entry', () => {
    const transcript = mapTranscriptionResponseToTranscript({
      text: 'Hello there. Budget is around 80k.',
      segments: [
        { start: 0, end: 1.5, text: ' Hello there.' },
        { start: 1.5, end: 2, text: '   ' },
        { start: 2, end: 4.25, text: ' Budget is around 80k.' },
      ],
    });

    expect(parseCallRecordingTranscriptEntries(transcript)).toEqual([
      {
        speakerName: undefined,
        startSeconds: 0,
        endSeconds: 1.5,
        text: 'Hello there.',
        words: [{ text: 'Hello there.', startSeconds: 0, endSeconds: 1.5 }],
      },
      {
        speakerName: undefined,
        startSeconds: 2,
        endSeconds: 4.25,
        text: 'Budget is around 80k.',
        words: [
          { text: 'Budget is around 80k.', startSeconds: 2, endSeconds: 4.25 },
        ],
      },
    ]);
  });

  it('falls back to the full text when the service returns no segments', () => {
    const transcript = mapTranscriptionResponseToTranscript({
      text: ' Quick voice note. ',
    });

    expect(parseCallRecordingTranscriptEntries(transcript)).toEqual([
      {
        speakerName: undefined,
        startSeconds: undefined,
        endSeconds: undefined,
        text: 'Quick voice note.',
        words: [
          {
            text: 'Quick voice note.',
            startSeconds: undefined,
            endSeconds: undefined,
          },
        ],
      },
    ]);
  });

  it('returns an empty transcript when nothing was said', () => {
    expect(
      mapTranscriptionResponseToTranscript({ text: '', segments: [] }),
    ).toEqual([]);
  });
});
