import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useCallback, useState } from 'react';

import { OnboardingSkipButton } from '@/onboarding/components/OnboardingSkipButton';
import { useCompleteGettingStartedVideoOnboardingStep } from '@/onboarding/hooks/useCompleteGettingStartedVideoOnboardingStep';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { MainButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledFooter = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: flex-end;
  width: 100%;
`;

export const GettingStartedVideoStepActions = () => {
  const { t } = useLingui();
  const { enqueueErrorSnackBar } = useSnackBar();
  const completeGettingStartedVideoOnboardingStep =
    useCompleteGettingStartedVideoOnboardingStep();
  const [isCompleting, setIsCompleting] = useState(false);

  const completeStep = useCallback(async () => {
    setIsCompleting(true);

    try {
      await completeGettingStartedVideoOnboardingStep();
    } catch (error) {
      setIsCompleting(false);

      enqueueErrorSnackBar({
        apolloError: CombinedGraphQLErrors.is(error) ? error : undefined,
      });
    }
  }, [completeGettingStartedVideoOnboardingStep, enqueueErrorSnackBar]);

  return (
    <StyledFooter>
      <OnboardingSkipButton
        onClick={() => void completeStep()}
        disabled={isCompleting}
      />
      <MainButton
        title={t`Continue`}
        onClick={() => void completeStep()}
        disabled={isCompleting}
      />
    </StyledFooter>
  );
};
