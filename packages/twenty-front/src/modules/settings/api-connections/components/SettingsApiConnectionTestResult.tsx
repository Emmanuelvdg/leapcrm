import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { Status } from 'twenty-ui/data-display';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledResult = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledMeta = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledPreview = styled.pre`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  font-size: ${themeCssVariables.font.size.xs};
  margin: 0;
  max-height: 240px;
  overflow: auto;
  padding: ${themeCssVariables.spacing[2]};
  white-space: pre-wrap;
  word-break: break-word;
`;

export type ApiConnectionTestResultView = {
  success: boolean;
  httpStatus?: number | null;
  durationMs?: number | null;
  responsePreview?: string | null;
  errorMessage?: string | null;
};

type SettingsApiConnectionTestResultProps = {
  result: ApiConnectionTestResultView;
};

export const SettingsApiConnectionTestResult = ({
  result,
}: SettingsApiConnectionTestResultProps) => {
  const { t } = useLingui();

  return (
    <StyledResult>
      <StyledMeta>
        <Status
          color={result.success ? 'green' : 'red'}
          text={result.success ? t`Test passed` : t`Test failed`}
        />
        {isDefined(result.httpStatus) && (
          <span>{t`HTTP ${result.httpStatus}`}</span>
        )}
        {isDefined(result.durationMs) && (
          <span>{t`${result.durationMs} ms`}</span>
        )}
      </StyledMeta>
      {!result.success && isDefined(result.errorMessage) && (
        <StyledPreview>{result.errorMessage}</StyledPreview>
      )}
      {result.success && isDefined(result.responsePreview) && (
        <StyledPreview>{result.responsePreview}</StyledPreview>
      )}
    </StyledResult>
  );
};
