import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type IcpPatternBucket } from 'twenty-shared/icp-analysis';
import { Tag } from 'twenty-ui/data-display';
import { IconPlus } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  StyledIcpCell,
  StyledIcpHeaderCell,
  StyledIcpTable,
} from '@/icp-analysis/components/IcpTable';
import { formatIcpLift } from '@/icp-analysis/utils/formatIcpLift';
import { formatIcpRate } from '@/icp-analysis/utils/formatIcpRate';

// The signal sits under the value rather than in its own column so the table
// still fits the record side panel.
const StyledValue = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

type IcpPatternTableProps = {
  buckets: IcpPatternBucket[];
  baselineWinRate: number;
  addedBucketKeys: string[];
  onAddBucket?: (bucket: IcpPatternBucket) => void;
};

// The bucket's own winRate and lift are smoothed for weight suggestions; a
// value with 0 wins out of 1 would read 33%. People are shown plain rates.
const getObservedWinRate = ({ wonCount, totalCount }: IcpPatternBucket) =>
  totalCount > 0 ? wonCount / totalCount : null;

export const IcpPatternTable = ({
  buckets,
  baselineWinRate,
  addedBucketKeys,
  onAddBucket,
}: IcpPatternTableProps) => {
  const { t } = useLingui();

  const getObservedLift = (bucket: IcpPatternBucket) => {
    const observedWinRate = getObservedWinRate(bucket);

    return observedWinRate !== null && baselineWinRate > 0
      ? observedWinRate / baselineWinRate
      : null;
  };

  const getSignalTag = (bucket: IcpPatternBucket) => {
    if (bucket.isLowSample) {
      return <Tag color="gray" text={t`Too few deals`} />;
    }

    switch (bucket.direction) {
      case 'POSITIVE':
        return <Tag color="green" text={t`Winning`} />;
      case 'NEGATIVE':
        return <Tag color="red" text={t`Losing`} />;
      default:
        return <Tag color="gray" text={t`No clear signal`} />;
    }
  };

  return (
    <StyledIcpTable>
      <thead>
        <tr>
          <StyledIcpHeaderCell>{t`Value`}</StyledIcpHeaderCell>
          <StyledIcpHeaderCell align="right">{t`Won`}</StyledIcpHeaderCell>
          <StyledIcpHeaderCell align="right">{t`Deals`}</StyledIcpHeaderCell>
          <StyledIcpHeaderCell align="right">{t`Win rate`}</StyledIcpHeaderCell>
          <StyledIcpHeaderCell align="right">{t`Lift`}</StyledIcpHeaderCell>
          {onAddBucket && <StyledIcpHeaderCell />}
        </tr>
      </thead>
      <tbody>
        {buckets.map((bucket) => (
          <tr key={bucket.key}>
            <StyledIcpCell>
              <StyledValue>
                <span>{bucket.label}</span>
                {getSignalTag(bucket)}
              </StyledValue>
            </StyledIcpCell>
            <StyledIcpCell align="right">{bucket.wonCount}</StyledIcpCell>
            <StyledIcpCell align="right">{bucket.totalCount}</StyledIcpCell>
            <StyledIcpCell align="right">
              {formatIcpRate(getObservedWinRate(bucket))}
            </StyledIcpCell>
            <StyledIcpCell align="right">
              {formatIcpLift(getObservedLift(bucket))}
            </StyledIcpCell>
            {onAddBucket && (
              <StyledIcpCell align="right">
                {!bucket.isLowSample &&
                  !addedBucketKeys.includes(bucket.key) && (
                    <IconButton
                      Icon={IconPlus}
                      size="small"
                      variant="tertiary"
                      ariaLabel={t`Add ${bucket.label} to the model`}
                      onClick={() => onAddBucket(bucket)}
                    />
                  )}
              </StyledIcpCell>
            )}
          </tr>
        ))}
      </tbody>
    </StyledIcpTable>
  );
};
