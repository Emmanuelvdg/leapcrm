import { useLingui } from '@lingui/react/macro';
import {
  type IcpModelEvaluation,
  type IcpTier,
} from 'twenty-shared/icp-analysis';

import {
  StyledIcpCell,
  StyledIcpHeaderCell,
  StyledIcpTable,
} from '@/icp-analysis/components/IcpTable';
import { formatIcpLift } from '@/icp-analysis/utils/formatIcpLift';
import { formatIcpRate } from '@/icp-analysis/utils/formatIcpRate';

type IcpBacktestTierTableProps = {
  evaluation: IcpModelEvaluation;
};

export const IcpBacktestTierTable = ({
  evaluation,
}: IcpBacktestTierTableProps) => {
  const { t } = useLingui();

  const tierLabels: Record<IcpTier, string> = {
    PRIORITY: t`Priority`,
    TARGET: t`Target`,
    NURTURE: t`Nurture`,
    EXCLUDED: t`Excluded`,
  };

  return (
    <StyledIcpTable>
      <thead>
        <tr>
          <StyledIcpHeaderCell>{t`Tier`}</StyledIcpHeaderCell>
          <StyledIcpHeaderCell align="right">{t`Deals`}</StyledIcpHeaderCell>
          <StyledIcpHeaderCell align="right">{t`Won`}</StyledIcpHeaderCell>
          <StyledIcpHeaderCell align="right">{t`Lost`}</StyledIcpHeaderCell>
          <StyledIcpHeaderCell align="right">{t`Win rate`}</StyledIcpHeaderCell>
          <StyledIcpHeaderCell align="right">{t`Lift`}</StyledIcpHeaderCell>
        </tr>
      </thead>
      <tbody>
        {evaluation.tiers.map((tierSummary) => (
          <tr key={tierSummary.tier}>
            <StyledIcpCell>{tierLabels[tierSummary.tier]}</StyledIcpCell>
            <StyledIcpCell align="right">
              {tierSummary.totalCount}
            </StyledIcpCell>
            <StyledIcpCell align="right">{tierSummary.wonCount}</StyledIcpCell>
            <StyledIcpCell align="right">{tierSummary.lostCount}</StyledIcpCell>
            <StyledIcpCell align="right">
              {formatIcpRate(tierSummary.winRate)}
            </StyledIcpCell>
            <StyledIcpCell align="right">
              {formatIcpLift(tierSummary.lift)}
            </StyledIcpCell>
          </tr>
        ))}
      </tbody>
    </StyledIcpTable>
  );
};
