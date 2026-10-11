import { render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';

import { DomainShell } from '@/app/components/DomainShell';
import { clientConfigApiStatusState } from '@/client-config/states/clientConfigApiStatusState';
import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

let isDefaultDomainValue = true;

jest.mock('@/apollo/components/ApolloProvider', () => ({
  ApolloProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('@/ui/theme/components/BaseThemeProvider', () => ({
  BaseThemeProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('@/client-config/components/ClientConfigProviderEffect', () => ({
  ClientConfigProviderEffect: () => null,
}));

jest.mock('@/auth/effect-components/CookieSessionBootEffect', () => ({
  CookieSessionBootEffect: () => null,
}));

jest.mock('@/client-config/components/ClientConfigProvider', () => ({
  ClientConfigProvider: ({ children }: React.PropsWithChildren) => (
    <>{children}</>
  ),
}));

jest.mock('~/loading/components/PageContentSkeletonLoader', () => ({
  PageContentSkeletonLoader: () => null,
}));

jest.mock('~/pages/whatsapp/WhatsappEmbeddedSignup', () => ({
  WhatsappEmbeddedSignup: () => <h1>Connect WhatsApp to LeapCRM</h1>,
}));

jest.mock('@/app/components/RootApp', () => ({
  RootApp: () => <div>ROOT_APP</div>,
}));

jest.mock('@/app/components/WorkspaceApp', () => ({
  WorkspaceApp: () => <div>WORKSPACE_APP</div>,
}));

jest.mock('~/loading/components/UserOrMetadataLoader', () => ({
  UserOrMetadataLoader: () => <div>LOADER</div>,
}));

jest.mock('@/onboarding/components/OnboardingPageLoader', () => ({
  OnboardingPageLoader: () => <div>ONBOARDING_LOADER</div>,
}));

jest.mock('@/domain-manager/hooks/useIsCurrentLocationOnDefaultDomain', () => ({
  useIsCurrentLocationOnDefaultDomain: () => ({
    isDefaultDomain: isDefaultDomainValue,
  }),
}));

const renderShell = () =>
  render(
    <JotaiProvider store={jotaiStore}>
      <DomainShell />
    </JotaiProvider>,
  );

const setClientConfigLoaded = (isLoadedOnce: boolean) => {
  jotaiStore.set(clientConfigApiStatusState.atom, {
    isLoadedOnce,
    isLoading: false,
    isErrored: false,
    isSaved: isLoadedOnce,
  });
};

describe('DomainShell', () => {
  beforeEach(() => {
    resetJotaiStore();
    isDefaultDomainValue = true;
    window.history.pushState({}, '', '/');
  });

  it('shows the loader until the client config has loaded', () => {
    setClientConfigLoaded(false);
    jotaiStore.set(isMultiWorkspaceEnabledState.atom, true);

    renderShell();

    expect(screen.getByText('LOADER')).toBeInTheDocument();
  });

  it('shows the onboarding loader on onboarding paths until the client config has loaded', () => {
    setClientConfigLoaded(false);
    jotaiStore.set(isMultiWorkspaceEnabledState.atom, true);
    window.history.pushState({}, '', '/welcome');

    renderShell();

    expect(screen.getByText('ONBOARDING_LOADER')).toBeInTheDocument();
  });

  it.each([
    { isMultiWorkspaceEnabled: true, isDefaultDomain: false },
    { isMultiWorkspaceEnabled: true, isDefaultDomain: true },
    { isMultiWorkspaceEnabled: false, isDefaultDomain: true },
  ])(
    'opens WhatsApp signup without mounting a workspace or login shell: %o',
    async ({ isMultiWorkspaceEnabled, isDefaultDomain }) => {
      setClientConfigLoaded(true);
      jotaiStore.set(
        isMultiWorkspaceEnabledState.atom,
        isMultiWorkspaceEnabled,
      );
      isDefaultDomainValue = isDefaultDomain;
      const signupPath =
        '/whatsapp/embedded-signup?workspaceOrigin=https%3A%2F%2Ftest-account.leapcrm.tech';
      window.history.pushState({}, '', signupPath);

      renderShell();

      expect(
        await screen.findByRole('heading', {
          name: 'Connect WhatsApp to LeapCRM',
        }),
      ).toBeInTheDocument();
      expect(screen.queryByText('ROOT_APP')).not.toBeInTheDocument();
      expect(screen.queryByText('WORKSPACE_APP')).not.toBeInTheDocument();
      expect(window.location.pathname + window.location.search).toBe(
        signupPath,
      );
    },
  );

  it('does not bypass workspace routing for other WhatsApp paths', () => {
    setClientConfigLoaded(true);
    jotaiStore.set(isMultiWorkspaceEnabledState.atom, true);
    isDefaultDomainValue = false;
    window.history.pushState({}, '', '/whatsapp/embedded-signup/other');

    renderShell();

    expect(screen.getByText('WORKSPACE_APP')).toBeInTheDocument();
  });

  it('mounts the workspace app directly in single-workspace mode', () => {
    setClientConfigLoaded(true);
    jotaiStore.set(isMultiWorkspaceEnabledState.atom, false);
    isDefaultDomainValue = true;

    renderShell();

    expect(screen.getByText('WORKSPACE_APP')).toBeInTheDocument();
  });

  it('mounts the root app on the default domain in multi-workspace mode', () => {
    setClientConfigLoaded(true);
    jotaiStore.set(isMultiWorkspaceEnabledState.atom, true);
    isDefaultDomainValue = true;

    renderShell();

    expect(screen.getByText('ROOT_APP')).toBeInTheDocument();
  });

  it('mounts the workspace app on a workspace domain in multi-workspace mode', () => {
    setClientConfigLoaded(true);
    jotaiStore.set(isMultiWorkspaceEnabledState.atom, true);
    isDefaultDomainValue = false;

    renderShell();

    expect(screen.getByText('WORKSPACE_APP')).toBeInTheDocument();
  });
});
