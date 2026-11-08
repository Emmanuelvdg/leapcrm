import { type IcpTier } from '@/icp-analysis/types/IcpTier';

export type IcpScoreReason =
  | {
      type: 'MATCH';
      criterionId: string;
      label: string;
      weight: number;
      isHardExclusion: boolean;
    }
  | {
      type: 'UNKNOWN';
      attributeKey: string;
      attributeLabel: string;
      weight: number;
    };

export type IcpScoreResult = {
  score: number;
  tier: IcpTier;
  coverage: number;
  isHardExcluded: boolean;
  reasons: IcpScoreReason[];
};
