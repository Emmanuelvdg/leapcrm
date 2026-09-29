import { GettingStartedVideoStepActions } from '@/onboarding/components/GettingStartedVideoStepActions';
import { OnboardingStepAnimatedItem } from '@/onboarding/components/OnboardingStepAnimatedItem';
import { StyledOnboardingStepHeading } from '@/onboarding/components/StyledOnboardingStepHeading';
import { StyledOnboardingStepPage } from '@/onboarding/components/StyledOnboardingStepPage';
import { StyledOnboardingStepSubtitle } from '@/onboarding/components/StyledOnboardingStepSubtitle';
import { StyledOnboardingStepTitle } from '@/onboarding/components/StyledOnboardingStepTitle';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { MOBILE_VIEWPORT, themeCssVariables } from 'twenty-ui/theme-constants';
import { Eyebrow } from 'twenty-ui/typography';

const StyledPage = styled(StyledOnboardingStepPage)`
  gap: ${themeCssVariables.spacing[5]};
  padding: ${themeCssVariables.spacing[6]} ${themeCssVariables.spacing[8]};

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    padding: ${themeCssVariables.spacing[6]} ${themeCssVariables.spacing[4]};
  }
`;

const StyledVideoWrapper = styled(OnboardingStepAnimatedItem)`
  display: flex;
  flex: 1;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
  width: 100%;
`;

const StyledVideo = styled.video`
  background-color: ${themeCssVariables.background.primary};
  border-radius: ${themeCssVariables.border.radius.lg};
  height: 100%;
  max-width: 800px;
  object-fit: contain;
  width: 100%;
`;

const StyledFooter = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  padding: ${themeCssVariables.spacing[2]};
  width: 100%;
`;

export const GettingStartedVideo = () => {
  const { t } = useLingui();

  return (
    <StyledPage>
      <StyledOnboardingStepHeading>
        <OnboardingStepAnimatedItem index={0}>
          <Eyebrow>{t`Get started`}</Eyebrow>
          <StyledOnboardingStepTitle>{t`Welcome to your new workspace`}</StyledOnboardingStepTitle>
        </OnboardingStepAnimatedItem>
        <OnboardingStepAnimatedItem index={1}>
          <StyledOnboardingStepSubtitle>
            {t`A quick tour of what you can do here.`}
          </StyledOnboardingStepSubtitle>
        </OnboardingStepAnimatedItem>
      </StyledOnboardingStepHeading>

      <StyledVideoWrapper index={2}>
        <StyledVideo src="/onboarding/getting-started.mp4" controls />
      </StyledVideoWrapper>

      <OnboardingStepAnimatedItem index={3}>
        <StyledFooter>
          <GettingStartedVideoStepActions />
        </StyledFooter>
      </OnboardingStepAnimatedItem>
    </StyledPage>
  );
};
