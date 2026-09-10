import { useHasMultipleAuthMethods } from '@/auth/sign-in-up/hooks/useHasMultipleAuthMethods';
import { useSignInUp } from '@/auth/sign-in-up/hooks/useSignInUp';
import { type Form } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import { lastAuthenticatedMethodState } from '@/auth/states/lastAuthenticatedMethodState';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';

import { LastUsedPill } from '@/auth/sign-in-up/components/internal/LastUsedPill';
import { SignInUpEmailField } from '@/auth/sign-in-up/components/internal/SignInUpEmailField';
import { SignInUpPasswordField } from '@/auth/sign-in-up/components/internal/SignInUpPasswordField';
import { StyledSSOButtonContainer } from '@/auth/sign-in-up/components/internal/SignInUpSSOButtonStyles';
import { AuthenticatedMethod } from '@/auth/types/AuthenticatedMethod.enum';
import { SignInUpMode } from '@/auth/types/signInUpMode';
import { isRequestingCaptchaTokenState } from '@/captcha/states/isRequestingCaptchaTokenState';
import { captchaState } from '@/client-config/states/captchaState';
import { isDDLLockedState } from '@/client-config/states/isDDLLockedState';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { isDefined } from 'twenty-shared/utils';
import { Loader } from 'twenty-ui/feedback';
import { MainButton, InputHint } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const StyledForm = styled.form`
  align-items: center;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  width: 100%;
`;

const StyledInitButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledSignInButtonRow = styled.div`
  position: relative;
  width: 100%;
`;

export const SignInUpWithCredentials = ({
  isGlobalScope,
}: {
  isGlobalScope?: boolean;
}) => {
  const { t } = useLingui();
  const form = useFormContext<Form>();

  const [signInUpStep, setSignInUpStep] = useAtomState(signInUpStepState);
  const [showErrors, setShowErrors] = useState(false);
  const captcha = useAtomStateValue(captchaState);
  const isDDLLocked = useAtomStateValue(isDDLLockedState);
  const isRequestingCaptchaToken = useAtomStateValue(
    isRequestingCaptchaTokenState,
  );
  const lastAuthenticatedMethod = useAtomStateValue(
    lastAuthenticatedMethodState,
  );
  const hasMultipleAuthMethods = useHasMultipleAuthMethods();

  const {
    signInUpMode,
    setSignInUpMode,
    continueWithEmail,
    continueWithCredentials,
    submitCredentials,
  } = useSignInUp(form);

  const isLastUsed =
    signInUpStep === SignInUpStep.Init &&
    lastAuthenticatedMethod === AuthenticatedMethod.EMAIL &&
    (isGlobalScope || hasMultipleAuthMethods);

  const handleSelectMode = (mode: SignInUpMode) => {
    setSignInUpMode(mode);
    continueWithEmail();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitButtonDisabled) return;

    if (signInUpStep === SignInUpStep.Email) {
      if (isDefined(form?.formState?.errors?.email)) {
        setShowErrors(true);
        return;
      }
      continueWithCredentials();
    } else if (signInUpStep === SignInUpStep.Password) {
      if (!form.formState.isSubmitting) {
        setShowErrors(true);
        form.handleSubmit(submitCredentials)();
      }
    }
  };

  const onEmailChange = (email: string) => {
    if (email !== form.getValues('email')) {
      setSignInUpStep(SignInUpStep.Email);
    }
  };

  const buttonTitle = useMemo(() => {
    if (signInUpMode === SignInUpMode.SignIn) {
      return t`Sign in`;
    }

    if (signInUpMode === SignInUpMode.SignUp) {
      return t`Sign up`;
    }

    return t`Continue`;
  }, [signInUpMode, t]);

  const shouldWaitForCaptchaToken =
    signInUpStep !== SignInUpStep.Init &&
    isDefined(captcha?.provider) &&
    isRequestingCaptchaToken;

  const isEmailStepSubmitButtonDisabledCondition =
    signInUpStep === SignInUpStep.Email &&
    (isDefined(form.formState.errors['email']) || shouldWaitForCaptchaToken);

  // TODO: isValid is actually a proxy function. If it is not rendered the first time, react might not trigger re-renders
  // We make the isValid check synchronous and update a reactState to make sure this does not happen
  const isPasswordStepSubmitButtonDisabledCondition =
    signInUpStep === SignInUpStep.Password &&
    (!form.formState.isValid ||
      form.formState.isSubmitting ||
      shouldWaitForCaptchaToken);

  const isSignUpBlockedByDDLLock =
    isDDLLocked &&
    signInUpMode === SignInUpMode.SignUp &&
    signInUpStep === SignInUpStep.Password;

  const isSubmitButtonDisabled =
    isEmailStepSubmitButtonDisabledCondition ||
    isPasswordStepSubmitButtonDisabledCondition ||
    isSignUpBlockedByDDLLock;

  if (signInUpStep === SignInUpStep.Init) {
    return (
      <StyledInitButtonGroup>
        <MainButton
          title={isGlobalScope ? t`Create account` : t`Join workspace`}
          type="button"
          variant="primary"
          onClick={() => handleSelectMode(SignInUpMode.SignUp)}
          fullWidth
        />
        <StyledSignInButtonRow>
          <MainButton
            title={t`Sign in`}
            type="button"
            variant="secondary"
            onClick={() => handleSelectMode(SignInUpMode.SignIn)}
            fullWidth
          />
          {isLastUsed && <LastUsedPill />}
        </StyledSignInButtonRow>
      </StyledInitButtonGroup>
    );
  }

  return (
    <>
      {(signInUpStep === SignInUpStep.Password ||
        signInUpStep === SignInUpStep.Email) && (
        <StyledForm onSubmit={handleSubmit}>
          <SignInUpEmailField
            showErrors={showErrors}
            onInputChange={onEmailChange}
          />
          {signInUpStep === SignInUpStep.Password && (
            <SignInUpPasswordField
              showErrors={showErrors}
              signInUpMode={signInUpMode}
            />
          )}
          <StyledSSOButtonContainer>
            <MainButton
              title={buttonTitle}
              type="submit"
              variant="primary"
              Icon={() => (form.formState.isSubmitting ? <Loader /> : null)}
              disabled={isSubmitButtonDisabled}
              fullWidth
            />
            {isSignUpBlockedByDDLLock && (
              <InputHint>{t`Sign-up is temporarily unavailable during maintenance.`}</InputHint>
            )}
          </StyledSSOButtonContainer>
        </StyledForm>
      )}
    </>
  );
};
