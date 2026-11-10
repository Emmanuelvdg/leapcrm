import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';

import { IcpAnalysisWidget } from '@/icp-analysis/components/IcpAnalysisWidget';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';

jest.mock('@/workspace/hooks/useIsFeatureEnabled');
jest.mock('@/settings/roles/hooks/useHasPermissionFlag');
jest.mock('@/icp-analysis/components/IcpAnalysisWidgetContent', () => ({
  IcpAnalysisWidgetContent: () => <button type="button">Run analysis</button>,
}));

const mockUseIsFeatureEnabled = useIsFeatureEnabled as jest.Mock;
const mockUseHasPermissionFlag = useHasPermissionFlag as jest.Mock;

const renderWidget = () =>
  render(
    <I18nProvider i18n={i18n}>
      <IcpAnalysisWidget />
    </I18nProvider>,
  );

describe('IcpAnalysisWidget', () => {
  it('explains that ICP analysis is off instead of offering actions', () => {
    mockUseIsFeatureEnabled.mockReturnValue(false);
    mockUseHasPermissionFlag.mockReturnValue(true);

    renderWidget();

    expect(
      screen.getByText('ICP analysis is not turned on for this workspace.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Run analysis' }),
    ).not.toBeInTheDocument();
  });

  it('explains that the role lacks the permission instead of offering actions', () => {
    mockUseIsFeatureEnabled.mockReturnValue(true);
    mockUseHasPermissionFlag.mockReturnValue(false);

    renderWidget();

    expect(
      screen.getByText(
        'Your role does not include ICP analysis. Ask a workspace admin for access.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Run analysis' }),
    ).not.toBeInTheDocument();
  });

  it('shows the analysis when the workspace and role allow it', () => {
    mockUseIsFeatureEnabled.mockReturnValue(true);
    mockUseHasPermissionFlag.mockReturnValue(true);

    renderWidget();

    expect(
      screen.getByRole('button', { name: 'Run analysis' }),
    ).toBeInTheDocument();
  });
});
