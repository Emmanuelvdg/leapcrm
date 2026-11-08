import { type IcpNumericBand } from '@/icp-analysis/types/IcpNumericBand';
import { isDefined } from '@/utils';

const compactNumberFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const formatIcpNumericBandLabel = ({
  min,
  max,
}: IcpNumericBand): string => {
  if (isDefined(min) && isDefined(max)) {
    return `${compactNumberFormat.format(min)}-${compactNumberFormat.format(max)}`;
  }

  if (isDefined(min)) {
    return `${compactNumberFormat.format(min)}+`;
  }

  if (isDefined(max)) {
    return `< ${compactNumberFormat.format(max)}`;
  }

  return 'Any';
};
