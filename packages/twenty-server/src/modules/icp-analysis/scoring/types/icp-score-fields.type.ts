import { type IcpTier } from 'twenty-shared/icp-analysis';

export type IcpScoreFields = {
  icpScore: number | null;
  icpTier: IcpTier | null;
  icpScoreReasons: string | null;
  icpCoverage: number | null;
  icpModelVersion: number | null;
  icpScoredAt: Date | null;
};
