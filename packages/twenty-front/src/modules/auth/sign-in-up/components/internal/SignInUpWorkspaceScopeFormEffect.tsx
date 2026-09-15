import { useAuth } from '@/auth/hooks/useAuth';
import { useSignInUp } from '@/auth/sign-in-up/hooks/useSignInUp';
import { useSignInUpForm } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import { signInUpModeState } from '@/auth/states/signInUpModeState';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { SignInUpMode } from '@/auth/types/signInUpMode';
import { useReadCaptchaToken } from '@/captcha/hooks/useReadCaptchaToken';
import { isRequestingCaptchaTokenState } from '@/captcha/states/isRequestingCaptchaTokenState';
import { captchaState } from '@/client-config/states/captchaState';
import { workspaceAuthProvidersState } from '@/workspace/states/workspaceAuthProvidersState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { useEffect, useRef, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';

const searchParams = new URLSearchParams(window.location.search);
const email = searchParams.get('email');

enum LoadingStatus {
  Loading = 'loading',
  RequestingCaptchaToken = 'requestingCaptchaToken',
  Done = 'done',
}

export const SignInUpWorkspaceScopeFormEffect = () => {
  const workspaceAuthProviders = useAtomStateValue(workspaceAuthProvidersState);

  const isRequestingCaptchaToken = useAtomStateValue(
    isRequestingCaptchaTokenState,
  );

  const captcha = useAtomStateValue(captchaState);

  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>(
    LoadingStatus.Loading,
  );

  const { form } = useSignInUpForm();

  const { isInviteMode, signInUpStep, continueWithEmail, continueWithCredentials } =
    useSignInUp(form);

  const setSignInUpStep = useSetAtomState(signInUpStepState);
  const setSignInUpMode = useSetAtomState(signInUpModeState);
  const {
    checkUserExists: { checkUserExistsQuery },
  } = useAuth();
  const { readCaptchaToken } = useReadCaptchaToken();
  const hasStartedInviteModeResolution = useRef(false);

  useEffect(() => {
    if (!workspaceAuthProviders) {
      return;
    }

    const hasOnlySSOProvidersEnabled =
      !workspaceAuthProviders.google &&
      !workspaceAuthProviders.microsoft &&
      !workspaceAuthProviders.password;

    if (hasOnlySSOProvidersEnabled && workspaceAuthProviders.sso.length > 1) {
      return setSignInUpStep(SignInUpStep.SSOIdentityProviderSelection);
    }
  }, [setSignInUpStep, workspaceAuthProviders]);

  useEffect(() => {
    if (loadingStatus === LoadingStatus.Done) {
      return;
    }

    if (!isDefined(captcha?.provider)) {
      setLoadingStatus(LoadingStatus.Done);
      return;
    }

    if (isRequestingCaptchaToken) {
      setLoadingStatus(LoadingStatus.RequestingCaptchaToken);
    }

    if (
      !isRequestingCaptchaToken &&
      loadingStatus === LoadingStatus.RequestingCaptchaToken
    ) {
      setLoadingStatus(LoadingStatus.Done);
    }
  }, [captcha?.provider, isRequestingCaptchaToken, loadingStatus]);

  useEffect(() => {
    if (!workspaceAuthProviders) return;

    if (
      signInUpStep === SignInUpStep.Init &&
      !workspaceAuthProviders.google &&
      !workspaceAuthProviders.microsoft &&
      workspaceAuthProviders.sso.length === 0
    ) {
      continueWithEmail();
      return;
    }

    if (
      signInUpStep !== SignInUpStep.Password &&
      signInUpStep !== SignInUpStep.Email &&
      isDefined(email) &&
      workspaceAuthProviders.password &&
      loadingStatus === LoadingStatus.Done
    ) {
      // signInUpMode defaults to SignIn, and continueWithCredentials() treats
      // that as the user's declared intent rather than re-checking it. An
      // invite link's prefilled email is most often a brand-new user (though
      // not always - they may already have an account from another
      // workspace), so unlike the normal "returning user" case this shortcut
      // is meant for, the mode can't be assumed here. Resolve it from
      // checkUserExists first so a new invitee doesn't hit a false "No
      // account found" error before ever seeing a password field.
      if (isInviteMode) {
        if (hasStartedInviteModeResolution.current) {
          return;
        }

        hasStartedInviteModeResolution.current = true;

        checkUserExistsQuery({
          variables: { email, captchaToken: readCaptchaToken() },
        })
          .then(({ data }) => {
            setSignInUpMode(
              data?.checkUserExists.exists
                ? SignInUpMode.SignIn
                : SignInUpMode.SignUp,
            );
            continueWithCredentials();
          })
          .catch(() => {
            hasStartedInviteModeResolution.current = false;
          });

        return;
      }

      continueWithCredentials();
    }
  }, [
    signInUpStep,
    workspaceAuthProviders,
    continueWithEmail,
    continueWithCredentials,
    loadingStatus,
    isInviteMode,
    checkUserExistsQuery,
    readCaptchaToken,
    setSignInUpMode,
  ]);

  return <></>;
};
