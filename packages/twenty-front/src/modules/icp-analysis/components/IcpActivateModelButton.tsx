import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type IcpBacktestResult } from 'twenty-shared/icp-analysis';
import { isDefined } from 'twenty-shared/utils';
import { IconRocket } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type IcpActivationWarning,
  getIcpActivationWarnings,
} from '@/icp-analysis/utils/getIcpActivationWarnings';
import { ConfirmationModal } from '@/ui/layout/modal/components/ConfirmationModal';
import { useModal } from '@/ui/layout/modal/hooks/useModal';

const StyledSubtitle = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledWarnings = styled.ul`
  color: ${themeCssVariables.font.color.danger};
  margin: 0;
  padding-left: ${themeCssVariables.spacing[4]};
`;

type IcpActivateModelButtonProps = {
  modelId: string;
  version: number;
  backtest: IcpBacktestResult | null;
  isLoading: boolean;
  isDisabled: boolean;
  onBeforeOpen: () => Promise<void>;
  onConfirm: () => void;
};

export const IcpActivateModelButton = ({
  modelId,
  version,
  backtest,
  isLoading,
  isDisabled,
  onBeforeOpen,
  onConfirm,
}: IcpActivateModelButtonProps) => {
  const { t } = useLingui();
  const { openModal } = useModal();

  const modalInstanceId = `icp-model-activate-${modelId}`;

  const warningLabels: Record<IcpActivationWarning, string> = {
    PRIORITY_NOT_ABOVE_BASELINE: t`Priority deals did not win more often than the average deal in the back-test.`,
    WEAK_SEPARATION: t`The criteria barely separate won from lost deals (AUC below 0.6).`,
  };

  const warnings = getIcpActivationWarnings(backtest);

  const handleClick = async () => {
    if (!isDefined(backtest)) {
      await onBeforeOpen();
    }

    openModal(modalInstanceId);
  };

  return (
    <>
      <Button
        Icon={IconRocket}
        size="small"
        variant="secondary"
        title={t`Activate`}
        isLoading={isLoading}
        disabled={isDisabled}
        onClick={handleClick}
      />
      <ConfirmationModal
        modalInstanceId={modalInstanceId}
        title={t`Activate version ${version}?`}
        subtitle={
          <StyledSubtitle>
            <span>
              {t`This version replaces the active model and scores every company and prospect candidate.`}
            </span>
            {warnings.length > 0 && (
              <StyledWarnings>
                {warnings.map((warning) => (
                  <li key={warning}>{warningLabels[warning]}</li>
                ))}
              </StyledWarnings>
            )}
          </StyledSubtitle>
        }
        onConfirmClick={onConfirm}
        confirmButtonText={t`Activate`}
        confirmButtonAccent="blue"
      />
    </>
  );
};
