import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import {
  type IcpBacktestResult,
  type IcpScoredRow,
} from 'twenty-shared/icp-analysis';
import { AppPath, CoreObjectNameSingular } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { Link } from 'react-router-dom';

import { IcpBacktestTierTable } from '@/icp-analysis/components/IcpBacktestTierTable';
import {
  IcpStat,
  StyledIcpEmpty,
  StyledIcpNotice,
  StyledIcpSectionTitle,
  StyledIcpStatGrid,
} from '@/icp-analysis/components/IcpStat';

const MAX_LISTED_MISSES = 10;

const StyledSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[5]};
`;

const StyledBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledMisses = styled.ul`
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  list-style: none;
  margin: 0;
  padding: 0;

  a {
    color: ${themeCssVariables.font.color.primary};
  }
`;

const formatAuc = (auc: number | null) =>
  isDefined(auc) ? auc.toFixed(2) : '-';

type IcpBacktestSectionProps = {
  backtest: IcpBacktestResult | null;
  hasAnalysis: boolean;
};

export const IcpBacktestSection = ({
  backtest,
  hasAnalysis,
}: IcpBacktestSectionProps) => {
  const { t } = useLingui();

  if (!isDefined(backtest)) {
    return (
      <StyledIcpEmpty>
        {hasAnalysis
          ? t`Loading deals to back-test...`
          : t`Run the analysis to back-test the criteria.`}
      </StyledIcpEmpty>
    );
  }

  const { inSample, holdout } = backtest;

  const renderMisses = (title: string, rows: IcpScoredRow[]) =>
    rows.length > 0 && (
      <StyledBlock>
        <StyledIcpSectionTitle>{title}</StyledIcpSectionTitle>
        <StyledMisses>
          {rows.slice(0, MAX_LISTED_MISSES).map((row) => {
            const dealName = isNonEmptyString(row.name)
              ? row.name
              : t`Untitled deal`;

            return (
              <li key={row.id}>
                <Link
                  to={getAppPath(AppPath.RecordShowPage, {
                    objectNameSingular: CoreObjectNameSingular.Opportunity,
                    objectRecordId: row.id,
                  })}
                >
                  {t`${dealName}, scored ${row.score}`}
                </Link>
              </li>
            );
          })}
        </StyledMisses>
      </StyledBlock>
    );

  return (
    <StyledSection>
      <StyledBlock>
        <StyledIcpSectionTitle>{t`All closed deals`}</StyledIcpSectionTitle>
        <StyledIcpStatGrid>
          <IcpStat
            label={t`Separation (AUC)`}
            value={formatAuc(inSample.auc)}
          />
          <IcpStat label={t`Deals`} value={String(inSample.totalCount)} />
        </StyledIcpStatGrid>
        <IcpBacktestTierTable evaluation={inSample} />
      </StyledBlock>
      <StyledBlock>
        <StyledIcpSectionTitle>{t`Newest deals, held out`}</StyledIcpSectionTitle>
        {isDefined(holdout) ? (
          <>
            <StyledIcpNotice>
              {t`Weights suggested from the oldest ${holdout.trainingCount} deals, then used to score the newest ${holdout.testCount}. This shows how well suggested weights hold up on deals they have not seen.`}
            </StyledIcpNotice>
            <StyledIcpStatGrid>
              <IcpStat
                label={t`Separation (AUC)`}
                value={formatAuc(holdout.evaluation.auc)}
              />
              <IcpStat
                label={t`Criteria suggested`}
                value={String(holdout.criteria.length)}
              />
            </StyledIcpStatGrid>
            <IcpBacktestTierTable evaluation={holdout.evaluation} />
          </>
        ) : (
          <StyledIcpEmpty>
            {t`Needs at least 40 closed deals, with both won and lost among the newest ones.`}
          </StyledIcpEmpty>
        )}
      </StyledBlock>
      {renderMisses(t`Won deals scored below Target`, inSample.wonBelowTarget)}
      {renderMisses(t`Lost deals scored Priority`, inSample.lostInPriority)}
    </StyledSection>
  );
};
