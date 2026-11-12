import { type IcpScoreReason } from 'twenty-shared/icp-analysis';

const REASON_SEPARATOR = ' · ';

const formatWeight = (weight: number): string =>
  weight > 0 ? `+${weight}` : `${weight}`;

const formatReason = (reason: IcpScoreReason): string => {
  if (reason.type === 'UNKNOWN') {
    return `${reason.attributeLabel} unknown`;
  }

  if (reason.isHardExclusion) {
    return `${reason.label} (excluded)`;
  }

  return `${reason.label} (${formatWeight(reason.weight)})`;
};

export const formatIcpScoreReasons = (reasons: IcpScoreReason[]): string =>
  reasons.map(formatReason).join(REASON_SEPARATOR);
