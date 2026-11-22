import { useCallback, useEffect, useRef, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { type MeetingRecording } from '@/call-recording/types/MeetingRecording';
import { getRecordingFileExtension } from '@/call-recording/utils/getRecordingFileExtension';
import { getSupportedRecorderMimeType } from '@/call-recording/utils/getSupportedRecorderMimeType';

export type MeetingRecorderStatus = 'idle' | 'recording' | 'paused';

export type MeetingRecorderError = 'unsupported' | 'microphone-denied';

type MeetingRecorderSession = {
  mediaRecorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  startedAt: Date;
  accumulatedMs: number;
  segmentStartedAtMs: number | null;
  timer: ReturnType<typeof setInterval> | null;
};

const TIMER_INTERVAL_MS = 500;
const RECORDER_TIMESLICE_MS = 1000;

const readElapsedMs = (session: MeetingRecorderSession) =>
  session.accumulatedMs +
  (isDefined(session.segmentStartedAtMs)
    ? Date.now() - session.segmentStartedAtMs
    : 0);

const stopTimer = (session: MeetingRecorderSession) => {
  if (isDefined(session.timer)) {
    clearInterval(session.timer);
    session.timer = null;
  }
};

const releaseSession = (session: MeetingRecorderSession) => {
  stopTimer(session);
  session.stream.getTracks().forEach((track) => track.stop());
};

const buildRecordingFileName = (startedAt: Date, mimeType: string) =>
  `meeting-${startedAt.toISOString().slice(0, 16).replace(':', '-')}.${getRecordingFileExtension(mimeType)}`;

export const useMeetingRecorder = () => {
  const [status, setStatus] = useState<MeetingRecorderStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<MeetingRecorderError | null>(null);

  // The MediaRecorder, microphone stream and timer are browser handles that
  // must survive re-renders without triggering them.
  // oxlint-disable-next-line twenty/no-state-useref
  const sessionRef = useRef<MeetingRecorderSession | null>(null);

  const startTimer = (session: MeetingRecorderSession) => {
    stopTimer(session);
    session.timer = setInterval(
      () => setElapsedSeconds(readElapsedMs(session) / 1000),
      TIMER_INTERVAL_MS,
    );
  };

  const endSession = () => {
    if (isDefined(sessionRef.current)) {
      releaseSession(sessionRef.current);
    }

    sessionRef.current = null;
    setStatus('idle');
  };

  const start = async () => {
    setError(null);

    if (
      typeof MediaRecorder === 'undefined' ||
      !isDefined(navigator.mediaDevices?.getUserMedia)
    ) {
      setError('unsupported');

      return;
    }

    let stream: MediaStream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('microphone-denied');

      return;
    }

    const mimeType = getSupportedRecorderMimeType((candidate) =>
      MediaRecorder.isTypeSupported(candidate),
    );
    const mediaRecorder = new MediaRecorder(
      stream,
      isDefined(mimeType) ? { mimeType } : undefined,
    );

    const session: MeetingRecorderSession = {
      mediaRecorder,
      stream,
      chunks: [],
      startedAt: new Date(),
      accumulatedMs: 0,
      segmentStartedAtMs: Date.now(),
      timer: null,
    };

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        session.chunks.push(event.data);
      }
    };

    sessionRef.current = session;
    mediaRecorder.start(RECORDER_TIMESLICE_MS);
    startTimer(session);
    setElapsedSeconds(0);
    setStatus('recording');
  };

  const pause = () => {
    const session = sessionRef.current;

    if (session?.mediaRecorder.state !== 'recording') {
      return;
    }

    session.mediaRecorder.pause();
    session.accumulatedMs = readElapsedMs(session);
    session.segmentStartedAtMs = null;
    stopTimer(session);
    setElapsedSeconds(session.accumulatedMs / 1000);
    setStatus('paused');
  };

  const resume = () => {
    const session = sessionRef.current;

    if (session?.mediaRecorder.state !== 'paused') {
      return;
    }

    session.mediaRecorder.resume();
    session.segmentStartedAtMs = Date.now();
    startTimer(session);
    setStatus('recording');
  };

  const stop = () =>
    new Promise<MeetingRecording | null>((resolve) => {
      const session = sessionRef.current;

      if (!isDefined(session)) {
        resolve(null);

        return;
      }

      session.mediaRecorder.onstop = () => {
        const mimeType = session.mediaRecorder.mimeType || 'audio/webm';
        const file = new File(
          session.chunks,
          buildRecordingFileName(session.startedAt, mimeType),
          { type: mimeType.split(';')[0] },
        );

        setElapsedSeconds(readElapsedMs(session) / 1000);
        endSession();
        resolve({ file, startedAt: session.startedAt, endedAt: new Date() });
      };

      session.mediaRecorder.stop();
    });

  const discard = () => {
    const session = sessionRef.current;

    if (isDefined(session) && session.mediaRecorder.state !== 'inactive') {
      session.mediaRecorder.onstop = null;
      session.mediaRecorder.stop();
    }

    endSession();
    setElapsedSeconds(0);
  };

  const releaseOnUnmount = useCallback(() => {
    if (isDefined(sessionRef.current)) {
      releaseSession(sessionRef.current);
      sessionRef.current = null;
    }
  }, []);

  // Releases the microphone if the panel closes mid-recording.
  useEffect(() => releaseOnUnmount, [releaseOnUnmount]);

  return {
    status,
    elapsedSeconds,
    error,
    start,
    pause,
    resume,
    stop,
    discard,
  };
};
