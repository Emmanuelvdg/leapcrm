import { useSetNextOnboardingStatus } from '@/onboarding/hooks/useSetNextOnboardingStatus';
import { useMutation } from '@apollo/client/react';
import { useCallback } from 'react';
import { CompleteGettingStartedVideoOnboardingStepDocument } from '~/generated-metadata/graphql';

export const useCompleteGettingStartedVideoOnboardingStep = () => {
  const setNextOnboardingStatus = useSetNextOnboardingStatus();
  const [completeGettingStartedVideoOnboardingStepMutation] = useMutation(
    CompleteGettingStartedVideoOnboardingStepDocument,
  );

  return useCallback(async () => {
    await completeGettingStartedVideoOnboardingStepMutation();
    setNextOnboardingStatus({ stepHistoryEffect: 'leaveUnchanged' });
  }, [completeGettingStartedVideoOnboardingStepMutation, setNextOnboardingStatus]);
};
