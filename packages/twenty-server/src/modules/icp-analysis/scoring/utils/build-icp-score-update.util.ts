import { type IcpScoreResult } from 'twenty-shared/icp-analysis';
import { isNonEmptyString } from '@sniptt/guards';

import { type IcpScoreFields } from 'src/modules/icp-analysis/scoring/types/icp-score-fields.type';
import { formatIcpScoreReasons } from 'src/modules/icp-analysis/scoring/utils/format-icp-score-reasons.util';

// Returns null when nothing a reader would see changed, so a nightly rescore
// does not rewrite every record. Text fields come back from the API as an
// empty string when stored as null, so both count as no reasons.
export const buildIcpScoreUpdate = ({
  current,
  result,
  modelVersion,
  scoredAt,
}: {
  current: Omit<IcpScoreFields, 'icpScoredAt'>;
  result: IcpScoreResult;
  modelVersion: number;
  scoredAt: Date;
}): IcpScoreFields | null => {
  const icpScoreReasons = formatIcpScoreReasons(result.reasons);

  const isUnchanged =
    current.icpScore === result.score &&
    current.icpTier === result.tier &&
    (current.icpScoreReasons ?? '') === icpScoreReasons &&
    current.icpCoverage === result.coverage &&
    current.icpModelVersion === modelVersion;

  if (isUnchanged) {
    return null;
  }

  return {
    icpScore: result.score,
    icpTier: result.tier,
    icpScoreReasons: isNonEmptyString(icpScoreReasons) ? icpScoreReasons : null,
    icpCoverage: result.coverage,
    icpModelVersion: modelVersion,
    icpScoredAt: scoredAt,
  };
};
