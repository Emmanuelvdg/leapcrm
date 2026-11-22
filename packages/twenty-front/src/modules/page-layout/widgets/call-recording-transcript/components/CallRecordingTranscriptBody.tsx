import { CallRecordingWidgetEmptyStateDisplay } from '@/page-layout/widgets/calendar-event-call-recording/components/CallRecordingWidgetEmptyStateDisplay';
import { CallRecordingWidgetForbiddenDisplay } from '@/page-layout/widgets/calendar-event-call-recording/components/CallRecordingWidgetForbiddenDisplay';
import { type CalendarEventCallRecordingCandidate } from '@/page-layout/widgets/calendar-event-call-recording/types/CalendarEventCallRecordingCandidate';
import { isCallRecordingTranscriptFailed } from '@/page-layout/widgets/calendar-event-call-recording/utils/isCallRecordingTranscriptFailed';
import { isCallRecordingTranscriptPending } from '@/page-layout/widgets/calendar-event-call-recording/utils/isCallRecordingTranscriptPending';
import { CallRecordingAudioPlayer } from '@/page-layout/widgets/call-recording-transcript/components/CallRecordingAudioPlayer';
import { CallRecordingTranscriptEntryList } from '@/page-layout/widgets/call-recording-transcript/components/CallRecordingTranscriptEntryList';
import { PageLayoutWidgetErrorDisplay } from '@/page-layout/widgets/components/PageLayoutWidgetErrorDisplay';
import { WidgetSkeletonLoader } from '@/page-layout/widgets/components/WidgetSkeletonLoader';
import { useCurrentWidget } from '@/page-layout/widgets/hooks/useCurrentWidget';
import { type WidgetAccessDenialInfo } from '@/page-layout/widgets/types/WidgetAccessDenialInfo';
import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { type ReactNode } from 'react';
import {
  isCallRecordingTranscriptStatusMarker,
  isDefined,
  isNonEmptyArray,
  parseCallRecordingTranscriptEntries,
} from 'twenty-shared/utils';

type CallRecordingTranscriptBodyProps = {
  callRecording: CalendarEventCallRecordingCandidate | undefined;
  loading: boolean;
  error: Error | undefined;
  restriction: WidgetAccessDenialInfo | undefined;
};

export const CallRecordingTranscriptBody = ({
  callRecording,
  loading,
  error,
  restriction,
}: CallRecordingTranscriptBodyProps) => {
  const widget = useCurrentWidget();

  if (isDefined(restriction)) {
    return <CallRecordingWidgetForbiddenDisplay restriction={restriction} />;
  }

  if (loading) {
    return <WidgetSkeletonLoader />;
  }

  if (isDefined(error)) {
    return <PageLayoutWidgetErrorDisplay widgetId={widget.id} error={error} />;
  }

  if (!isDefined(callRecording)) {
    return (
      <CallRecordingWidgetEmptyStateDisplay
        animatedPlaceholderType="noMatchRecord"
        title={t`No Call Recording`}
        subTitle={t`No call recording exists here yet.`}
      />
    );
  }

  const audioUrl = callRecording.audio?.[0]?.url;

  const withAudioPlayer = (content: ReactNode) =>
    isNonEmptyString(audioUrl) ? (
      <>
        <CallRecordingAudioPlayer url={audioUrl} />
        {content}
      </>
    ) : (
      content
    );

  const transcriptEntries = parseCallRecordingTranscriptEntries(
    callRecording.transcript,
  );

  if (isNonEmptyArray(transcriptEntries)) {
    return withAudioPlayer(
      <CallRecordingTranscriptEntryList entries={transcriptEntries} />,
    );
  }

  if (isCallRecordingTranscriptPending(callRecording)) {
    return withAudioPlayer(
      <CallRecordingWidgetEmptyStateDisplay
        animatedPlaceholderType="loadingMessages"
        title={t`Preparing Transcript`}
        subTitle={t`Transcript is being prepared…`}
      />,
    );
  }

  if (isCallRecordingTranscriptFailed(callRecording)) {
    const failureReason =
      isCallRecordingTranscriptStatusMarker(callRecording.transcript) &&
      isNonEmptyString(callRecording.transcript.reason)
        ? callRecording.transcript.reason
        : undefined;

    return withAudioPlayer(
      <CallRecordingWidgetEmptyStateDisplay
        animatedPlaceholderType="errorIndex"
        title={t`Transcript Failed`}
        subTitle={failureReason ?? t`The transcript could not be generated.`}
      />,
    );
  }

  return withAudioPlayer(
    <CallRecordingWidgetEmptyStateDisplay
      animatedPlaceholderType="noMatchRecord"
      title={t`No Transcript`}
      subTitle={t`No transcript is available for this recording.`}
    />,
  );
};
