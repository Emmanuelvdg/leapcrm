import { styled } from '@linaria/react';
import { useCallback, useEffect } from 'react';

import { isAppEffectRedirectEnabledState } from '@/app/states/isAppEffectRedirectEnabledState';
import { Logo } from '@/auth/components/Logo';
import { SubTitle } from '@/auth/components/SubTitle';
import { Title } from '@/auth/components/Title';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { isCreatingWorkspaceState } from '@/auth/states/isCreatingWorkspaceState';
import { OnboardingStepAnimatedItem } from '@/onboarding/components/OnboardingStepAnimatedItem';
import { useSetNextOnboardingStatus } from '@/onboarding/hooks/useSetNextOnboardingStatus';
import { hasTriggeredWorkspaceActivationState } from '@/onboarding/states/hasTriggeredWorkspaceActivationState';
import { onboardingActivationFailedState } from '@/onboarding/states/onboardingActivationFailedState';
import { onboardingFreeCreditsState } from '@/onboarding/states/onboardingFreeCreditsState';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { useLoadCurrentUser } from '@/users/hooks/useLoadCurrentUser';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useStore } from 'jotai';
import { isDefined } from 'twenty-shared/utils';
import { MainButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import {
  ActivateWorkspaceDocument,
  MySubscriptionStatusDocument,
} from '~/generated-metadata/graphql';

const StyledContainer = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
  width: 100%;
`;

const StyledButtonContainer = styled.div`
  margin-top: ${themeCssVariables.spacing[8]};
  width: 200px;
`;

export const WorkspaceActivation = () => {
  const { t } = useLingui();
  const { enqueueErrorSnackBar } = useSnackBar();
  const setNextOnboardingStatus = useSetNextOnboardingStatus();
  const { loadCurrentUser } = useLoadCurrentUser();
  const apolloClient = useApolloClient();
  const [activateWorkspace, { loading: isActivating }] = useMutation(
    ActivateWorkspaceDocument,
  );
  const onboardingActivationFailed = useAtomStateValue(
    onboardingActivationFailedState,
  );
  const setOnboardingActivationFailed = useSetAtomState(
    onboardingActivationFailedState,
  );
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const setIsCreatingWorkspace = useSetAtomState(isCreatingWorkspaceState);
  const setOnboardingFreeCredits = useSetAtomState(onboardingFreeCreditsState);
  const setIsAppEffectRedirectEnabled = useSetAtomState(
    isAppEffectRedirectEnabledState,
  );

  const activate = useCallback(async () => {
    setOnboardingActivationFailed(false);

    try {
      const result = await activateWorkspace({
        variables: {
          input: {},
        },
      });

      if (isDefined(result.error)) {
        throw result.error;
      }

      setIsAppEffectRedirectEnabled(false);
      await loadCurrentUser();
      // The paywall gate reads this same query — force it fresh now rather
      // than leaving whatever answer it cached before the workspace's
      // subscription row existed (mid-activation, always "locked") to stick
      // until some unrelated remount happens to refetch it.
      await apolloClient.query({
        query: MySubscriptionStatusDocument,
        fetchPolicy: 'network-only',
      });
      setNextOnboardingStatus({ stepHistoryEffect: 'leaveUnchanged' });
      setIsCreatingWorkspace(false);
      setIsAppEffectRedirectEnabled(true);
    } catch (error) {
      setIsAppEffectRedirectEnabled(true);
      setIsCreatingWorkspace(false);
      setOnboardingActivationFailed(true);

      enqueueErrorSnackBar({
        apolloError: CombinedGraphQLErrors.is(error) ? error : undefined,
      });
    }
  }, [
    activateWorkspace,
    apolloClient,
    enqueueErrorSnackBar,
    loadCurrentUser,
    setOnboardingActivationFailed,
    setIsAppEffectRedirectEnabled,
    setIsCreatingWorkspace,
    setNextOnboardingStatus,
  ]);

  // Guard the one-shot trigger with a Jotai atom, not a ref: the router gets
  // recreated (and this component remounted) mid-activation whenever
  // isAdminPageEnabled flips as the current user finishes loading elsewhere,
  // which would reset a component-local ref and fire a second concurrent
  // activation that trips the server's lock ("Workspace is already being
  // created"). The Jotai store lives above the router, so it survives that
  // remount the same way a ref survives StrictMode's double-invocation.
  const store = useStore();
  useEffect(() => {
    if (
      store.get(hasTriggeredWorkspaceActivationState.atom) ||
      !isDefined(currentWorkspace)
    ) {
      return;
    }

    store.set(hasTriggeredWorkspaceActivationState.atom, true);
    setOnboardingFreeCredits({
      importContacts: 0,
      inviteTeam: 0,
      installApps: 0,
    });
    void activate();
  }, [activate, currentWorkspace, setOnboardingFreeCredits, store]);

  if (!onboardingActivationFailed) {
    return null;
  }

  return (
    <StyledContainer>
      <OnboardingStepAnimatedItem index={0}>
        <Logo
          primaryLogo={
            isNonEmptyString(currentWorkspace?.logo)
              ? currentWorkspace?.logo
              : undefined
          }
        />
      </OnboardingStepAnimatedItem>
      <OnboardingStepAnimatedItem index={1}>
        <Title>
          <Trans>Workspace creation failed</Trans>
        </Title>
      </OnboardingStepAnimatedItem>
      <OnboardingStepAnimatedItem index={2}>
        <SubTitle>
          <Trans>
            Something went wrong while creating your workspace. Please try
            again.
          </Trans>
        </SubTitle>
      </OnboardingStepAnimatedItem>
      <OnboardingStepAnimatedItem index={3}>
        <StyledButtonContainer>
          <MainButton
            title={t`Retry`}
            onClick={() => {
              void activate();
            }}
            disabled={isActivating}
            fullWidth
          />
        </StyledButtonContainer>
      </OnboardingStepAnimatedItem>
    </StyledContainer>
  );
};
