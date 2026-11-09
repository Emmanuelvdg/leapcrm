import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import {
  type IcpBacktestResult,
  type IcpCriterion,
  type IcpTierThresholds,
} from 'twenty-shared/icp-analysis';
import { isDefined } from 'twenty-shared/utils';
import { IconSparkles } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { IcpBacktestTierTable } from '@/icp-analysis/components/IcpBacktestTierTable';
import { IcpCriteriaEditor } from '@/icp-analysis/components/IcpCriteriaEditor';
import {
  IcpStat,
  StyledIcpEmpty,
  StyledIcpNotice,
  StyledIcpSectionTitle,
  StyledIcpStatGrid,
} from '@/icp-analysis/components/IcpStat';
import { IcpTierThresholdsEditor } from '@/icp-analysis/components/IcpTierThresholdsEditor';
import { formatIcpRate } from '@/icp-analysis/utils/formatIcpRate';

const StyledSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[5]};
`;

const StyledActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

type IcpModelSectionProps = {
  criteria: IcpCriterion[];
  thresholds: IcpTierThresholds;
  isEditable: boolean;
  isDirty: boolean;
  hasAnalysis: boolean;
  backtest: IcpBacktestResult | null;
  isSuggesting: boolean;
  isSaving: boolean;
  onCriteriaChange: (criteria: IcpCriterion[]) => void;
  onThresholdsChange: (thresholds: IcpTierThresholds) => void;
  onSuggest: () => void;
  onSave: () => void;
  onDiscard: () => void;
};

export const IcpModelSection = ({
  criteria,
  thresholds,
  isEditable,
  isDirty,
  hasAnalysis,
  backtest,
  isSuggesting,
  isSaving,
  onCriteriaChange,
  onThresholdsChange,
  onSuggest,
  onSave,
  onDiscard,
}: IcpModelSectionProps) => {
  const { t } = useLingui();

  const inSample = backtest?.inSample;
  const priorityWinRate = inSample?.tiers.find(
    ({ tier }) => tier === 'PRIORITY',
  )?.winRate;

  return (
    <StyledSection>
      {!isEditable && (
        <StyledIcpNotice>
          {t`This model is active or archived, so its criteria are fixed. Duplicate it to make changes.`}
        </StyledIcpNotice>
      )}
      {isEditable && (
        <StyledActions>
          <Button
            Icon={IconSparkles}
            size="small"
            variant="secondary"
            title={t`Suggest weights`}
            disabled={!hasAnalysis || isSuggesting}
            isLoading={isSuggesting}
            onClick={onSuggest}
          />
          <Button
            size="small"
            variant="primary"
            accent="blue"
            title={t`Save`}
            disabled={!isDirty || isSaving}
            isLoading={isSaving}
            onClick={onSave}
          />
          <Button
            size="small"
            variant="tertiary"
            title={t`Discard changes`}
            disabled={!isDirty || isSaving}
            onClick={onDiscard}
          />
        </StyledActions>
      )}
      <IcpCriteriaEditor
        criteria={criteria}
        isEditable={isEditable}
        onChange={onCriteriaChange}
      />
      <StyledBlock>
        <StyledIcpSectionTitle>{t`Tier thresholds`}</StyledIcpSectionTitle>
        <IcpTierThresholdsEditor
          thresholds={thresholds}
          isEditable={isEditable}
          onChange={onThresholdsChange}
        />
      </StyledBlock>
      <StyledBlock>
        <StyledIcpSectionTitle>{t`How these criteria score past deals`}</StyledIcpSectionTitle>
        {isDefined(inSample) ? (
          <>
            <StyledIcpStatGrid>
              <IcpStat
                label={t`Separation (AUC)`}
                value={isDefined(inSample.auc) ? inSample.auc.toFixed(2) : '-'}
              />
              <IcpStat
                label={t`Priority win rate`}
                value={formatIcpRate(priorityWinRate)}
              />
              <IcpStat
                label={t`Average win rate`}
                value={formatIcpRate(inSample.baselineWinRate)}
              />
            </StyledIcpStatGrid>
            {inSample.isAucBelowActivationThreshold === true && (
              <StyledIcpNotice>
                {t`Scores barely separate won from lost deals (AUC under 0.6).`}
              </StyledIcpNotice>
            )}
            {inSample.doesPriorityBeatBaseline === false && (
              <StyledIcpNotice>
                {t`Priority deals do not win more often than average.`}
              </StyledIcpNotice>
            )}
            <IcpBacktestTierTable evaluation={inSample} />
          </>
        ) : (
          <StyledIcpEmpty>
            {hasAnalysis
              ? t`Loading deals to back-test...`
              : t`Run the analysis to back-test the criteria.`}
          </StyledIcpEmpty>
        )}
      </StyledBlock>
    </StyledSection>
  );
};
