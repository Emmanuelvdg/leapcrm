import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledAudio = styled.audio`
  display: block;
  margin-bottom: ${themeCssVariables.spacing[3]};
  width: 100%;
`;

type CallRecordingAudioPlayerProps = {
  url: string;
};

export const CallRecordingAudioPlayer = ({
  url,
}: CallRecordingAudioPlayerProps) => (
  <StyledAudio
    aria-label={t`Recording audio`}
    controls
    preload="metadata"
    src={url}
  />
);
