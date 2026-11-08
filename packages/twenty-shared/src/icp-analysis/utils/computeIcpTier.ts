import { type IcpTier } from '@/icp-analysis/types/IcpTier';
import { type IcpTierThresholds } from '@/icp-analysis/types/IcpTierThresholds';

export const computeIcpTier = ({
  score,
  thresholds,
  isHardExcluded,
}: {
  score: number;
  thresholds: IcpTierThresholds;
  isHardExcluded: boolean;
}): IcpTier => {
  if (isHardExcluded) {
    return 'EXCLUDED';
  }

  if (score >= thresholds.priority) {
    return 'PRIORITY';
  }

  if (score >= thresholds.target) {
    return 'TARGET';
  }

  if (score >= thresholds.nurture) {
    return 'NURTURE';
  }

  return 'EXCLUDED';
};
