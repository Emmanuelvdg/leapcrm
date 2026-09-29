import { gql } from '@apollo/client';

export const COMPLETE_GETTING_STARTED_VIDEO_ONBOARDING_STEP = gql`
  mutation CompleteGettingStartedVideoOnboardingStep {
    completeGettingStartedVideoOnboardingStep {
      success
    }
  }
`;
