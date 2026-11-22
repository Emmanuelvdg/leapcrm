import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import {
  IconCheck,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconTrash,
  IconUpload,
  useIcons,
} from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useMeetingRecorder } from '@/call-recording/hooks/useMeetingRecorder';
import { useSaveCallRecording } from '@/call-recording/hooks/useSaveCallRecording';
import { recordCallRecordingTargetComponentState } from '@/call-recording/states/recordCallRecordingTargetComponentState';
import { type MeetingRecording } from '@/call-recording/types/MeetingRecording';
import { formatRecordingDuration } from '@/call-recording/utils/formatRecordingDuration';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { useSidePanelHistory } from '@/side-panel/hooks/useSidePanelHistory';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledRecorderCard = styled.div`
  align-items: center;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[6]} ${themeCssVariables.spacing[4]};
`;

const StyledTimer = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xxl};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledStatus = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: center;
`;

const StyledHint = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
`;

const StyledError = styled.div`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledHiddenFileInput = styled.input`
  display: none;
`;

export const SidePanelRecordCallRecordingPage = () => {
  const recordCallRecordingTarget = useAtomComponentStateValue(
    recordCallRecordingTargetComponentState,
  );

  const { getIcon } = useIcons();
  const IconMicrophone = getIcon('IconMicrophone');

  const recorder = useMeetingRecorder();
  const { saveCallRecording } = useSaveCallRecording();
  const { goBackFromSidePanel } = useSidePanelHistory();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState<MeetingRecording | null>(null);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isCapturing = recorder.status !== 'idle';

  // Closing the tab mid-meeting would lose the recording.
  useEffect(() => {
    if (!isCapturing) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isCapturing]);

  if (!isDefined(recordCallRecordingTarget)) {
    return null;
  }

  const recordName = recordCallRecordingTarget.recordName;
  const defaultTitle = t`Meeting with ${recordName}`;

  const handleStop = async () => {
    const stoppedRecording = await recorder.stop();

    if (isDefined(stoppedRecording)) {
      setRecording(stoppedRecording);
    }
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (isDefined(file)) {
      setRecording({ file, startedAt: null, endedAt: null });
    }
  };

  const handleSave = async () => {
    if (!isDefined(recording)) {
      return;
    }

    setIsSaving(true);

    try {
      await saveCallRecording({
        file: recording.file,
        title: isNonEmptyString(title.trim()) ? title.trim() : defaultTitle,
        target: recordCallRecordingTarget,
        startedAt: recording.startedAt,
        endedAt: recording.endedAt,
      });

      enqueueSuccessSnackBar({
        message: t`Recording saved. The transcript will appear on it when it is ready.`,
      });
      goBackFromSidePanel();
    } catch {
      enqueueErrorSnackBar({
        message: t`The recording could not be saved. Please try again.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const recordingFileName = recording?.file.name ?? '';

  const statusLabel = isDefined(recording)
    ? t`Ready to save: ${recordingFileName}`
    : recorder.status === 'recording'
      ? t`Recording`
      : recorder.status === 'paused'
        ? t`Paused`
        : t`Ready to record`;

  return (
    <StyledContainer>
      <StyledContent>
        <FormTextFieldInput
          label={t`Title`}
          placeholder={defaultTitle}
          defaultValue={title}
          onChange={setTitle}
        />
        <StyledRecorderCard>
          <StyledTimer>
            {formatRecordingDuration(recorder.elapsedSeconds)}
          </StyledTimer>
          <StyledStatus>{statusLabel}</StyledStatus>
          <StyledActions>
            {!isDefined(recording) && recorder.status === 'idle' && (
              <>
                <Button
                  title={t`Start recording`}
                  Icon={IconMicrophone}
                  variant="primary"
                  accent="blue"
                  size="small"
                  onClick={recorder.start}
                />
                <Button
                  title={t`Upload a file`}
                  Icon={IconUpload}
                  variant="secondary"
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                />
              </>
            )}
            {recorder.status === 'recording' && (
              <Button
                title={t`Pause`}
                Icon={IconPlayerPause}
                variant="secondary"
                size="small"
                onClick={recorder.pause}
              />
            )}
            {recorder.status === 'paused' && (
              <Button
                title={t`Resume`}
                Icon={IconPlayerPlay}
                variant="secondary"
                size="small"
                onClick={recorder.resume}
              />
            )}
            {isCapturing && (
              <Button
                title={t`Stop`}
                Icon={IconPlayerStop}
                variant="primary"
                accent="danger"
                size="small"
                onClick={handleStop}
              />
            )}
            {isDefined(recording) && (
              <Button
                title={t`Discard`}
                Icon={IconTrash}
                variant="secondary"
                size="small"
                disabled={isSaving}
                onClick={() => {
                  recorder.discard();
                  setRecording(null);
                }}
              />
            )}
          </StyledActions>
        </StyledRecorderCard>
        {recorder.error === 'microphone-denied' && (
          <StyledError>
            {t`Microphone access was blocked. Allow it in your browser settings, or upload a recording instead.`}
          </StyledError>
        )}
        {recorder.error === 'unsupported' && (
          <StyledError>
            {t`This browser cannot record audio. Upload a recording instead.`}
          </StyledError>
        )}
        <StyledHint>
          {t`Keep this panel open while recording. On a phone, recording stops when the screen locks, so for long meetings use your phone's voice recorder and upload the file here. Let everyone know the meeting is being recorded.`}
        </StyledHint>
        <StyledHiddenFileInput
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileSelected}
        />
      </StyledContent>
      <SidePanelFooter
        actions={[
          <Button
            key="save-recording"
            title={isSaving ? t`Saving...` : t`Save recording`}
            Icon={IconCheck}
            variant="primary"
            accent="blue"
            size="small"
            disabled={!isDefined(recording) || isSaving}
            onClick={handleSave}
          />,
        ]}
      />
    </StyledContainer>
  );
};
