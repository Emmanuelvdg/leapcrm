import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  IcpStat,
  StyledIcpEmpty,
  StyledIcpNotice,
  StyledIcpSectionTitle,
  StyledIcpStatGrid,
} from '@/icp-analysis/components/IcpStat';
import { type IcpModelAnalysisSnapshot } from '@/icp-analysis/types/IcpModelRecord';
import { formatIcpRate } from '@/icp-analysis/utils/formatIcpRate';

const StyledSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
`;

const StyledCoverageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledCoverageRow = styled.div`
  align-items: center;
  display: grid;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(120px, 1fr) 2fr 40px;
`;

const StyledCoverageLabel = styled.span`
  color: ${themeCssVariables.font.color.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledCoverageTrack = styled.div`
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.pill};
  height: 6px;
  overflow: hidden;
`;

const StyledCoverageFill = styled.div<{ percent: number }>`
  background: ${themeCssVariables.color.blue};
  height: 100%;
  width: ${({ percent }) => `${percent}%`};
`;

const StyledCoverageValue = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  text-align: right;
`;

const formatDate = (isoDate: string) => new Date(isoDate).toLocaleDateString();

type IcpEvidenceSectionProps = {
  analysis: IcpModelAnalysisSnapshot | null;
};

export const IcpEvidenceSection = ({ analysis }: IcpEvidenceSectionProps) => {
  const { t } = useLingui();

  if (!isDefined(analysis)) {
    return (
      <StyledIcpEmpty>
        {t`Run the analysis to load won and lost deals and see which company attributes are known.`}
      </StyledIcpEmpty>
    );
  }

  const { patterns, window } = analysis;
  const windowStart = formatDate(window.start);
  const windowLabel = isDefined(window.end)
    ? t`${windowStart} to ${formatDate(window.end)}`
    : t`Since ${windowStart}`;

  const attributesByCoverage = [...patterns.attributes].sort(
    (first, second) => second.coverage - first.coverage,
  );

  return (
    <StyledSection>
      <StyledIcpStatGrid>
        <IcpStat label={t`Won deals`} value={String(patterns.wonCount)} />
        <IcpStat label={t`Lost deals`} value={String(patterns.lostCount)} />
        <IcpStat
          label={t`Average win rate`}
          value={formatIcpRate(patterns.baselineWinRate)}
        />
        <IcpStat
          label={t`Left out, no company`}
          value={String(analysis.excludedWithoutCompanyCount)}
        />
        <IcpStat label={t`Deals closed`} value={windowLabel} />
      </StyledIcpStatGrid>
      {!patterns.isSampleSizeSufficient && (
        <StyledIcpNotice>
          {t`Fewer than 20 won or 20 lost deals. Treat the patterns as a hint, not a rule.`}
        </StyledIcpNotice>
      )}
      {analysis.isTruncated && (
        <StyledIcpNotice>
          {t`Only the newest 5,000 closed deals were analyzed.`}
        </StyledIcpNotice>
      )}
      <StyledIcpSectionTitle>{t`Known for the deals' companies`}</StyledIcpSectionTitle>
      {attributesByCoverage.length === 0 ? (
        <StyledIcpEmpty>
          {t`No company fields can be analyzed yet. Add select, number, date or boolean fields to companies, or enrich them.`}
        </StyledIcpEmpty>
      ) : (
        <StyledCoverageList>
          {attributesByCoverage.map((attribute) => (
            <StyledCoverageRow key={attribute.attributeKey}>
              <StyledCoverageLabel title={attribute.label}>
                {attribute.label}
              </StyledCoverageLabel>
              <StyledCoverageTrack>
                <StyledCoverageFill percent={attribute.coverage} />
              </StyledCoverageTrack>
              <StyledCoverageValue>{`${attribute.coverage}%`}</StyledCoverageValue>
            </StyledCoverageRow>
          ))}
        </StyledCoverageList>
      )}
    </StyledSection>
  );
};
