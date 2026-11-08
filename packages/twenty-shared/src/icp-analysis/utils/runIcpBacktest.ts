import { ICP_HOLDOUT_MIN_DATASET_SIZE } from '@/icp-analysis/constants/IcpHoldoutMinDatasetSize';
import { type IcpAttributeDefinition } from '@/icp-analysis/types/IcpAttributeDefinition';
import { type IcpAttributeValues } from '@/icp-analysis/types/IcpAttributeValue';
import {
  type IcpBacktestResult,
  type IcpHoldoutEvaluation,
} from '@/icp-analysis/types/IcpBacktestResult';
import { type IcpCriterion } from '@/icp-analysis/types/IcpCriterion';
import { type IcpDatasetRow } from '@/icp-analysis/types/IcpDatasetRow';
import { type IcpTierThresholds } from '@/icp-analysis/types/IcpTierThresholds';
import { computeIcpAttributePatterns } from '@/icp-analysis/utils/computeIcpAttributePatterns';
import { computeIcpScoreDistribution } from '@/icp-analysis/utils/computeIcpScoreDistribution';
import { evaluateIcpModel } from '@/icp-analysis/utils/evaluateIcpModel';
import { splitIcpDatasetByClosedAt } from '@/icp-analysis/utils/splitIcpDatasetByClosedAt';
import { suggestIcpCriterionWeights } from '@/icp-analysis/utils/suggestIcpCriterionWeights';
import { isDefined } from '@/utils';

const hasBothOutcomes = (rows: IcpDatasetRow[]): boolean =>
  rows.some(({ outcome }) => outcome === 'WON') &&
  rows.some(({ outcome }) => outcome === 'LOST');

// The user's criteria were shaped by every deal, so scoring the newest deals
// with them would leak. The holdout re-suggests weights from the older deals
// only and scores the newest ones with those.
const runHoldout = ({
  rows,
  attributes,
  thresholds,
}: {
  rows: IcpDatasetRow[];
  attributes: IcpAttributeDefinition[];
  thresholds: IcpTierThresholds;
}): IcpHoldoutEvaluation | null => {
  if (rows.length < ICP_HOLDOUT_MIN_DATASET_SIZE) {
    return null;
  }

  const { trainingRows, testRows } = splitIcpDatasetByClosedAt({ rows });

  if (!hasBothOutcomes(trainingRows) || !hasBothOutcomes(testRows)) {
    return null;
  }

  const criteria = suggestIcpCriterionWeights({
    analysis: computeIcpAttributePatterns({ rows: trainingRows, attributes }),
  });

  return {
    trainingCount: trainingRows.length,
    testCount: testRows.length,
    criteria,
    evaluation: evaluateIcpModel({ criteria, thresholds, rows: testRows }),
  };
};

export const runIcpBacktest = ({
  criteria,
  thresholds,
  rows,
  attributes,
  comparisonValuesList,
}: {
  criteria: IcpCriterion[];
  thresholds: IcpTierThresholds;
  rows: IcpDatasetRow[];
  attributes: IcpAttributeDefinition[];
  comparisonValuesList?: IcpAttributeValues[];
}): IcpBacktestResult => ({
  inSample: evaluateIcpModel({ criteria, thresholds, rows }),
  holdout: runHoldout({ rows, attributes, thresholds }),
  comparison: isDefined(comparisonValuesList)
    ? computeIcpScoreDistribution({
        criteria,
        thresholds,
        valuesList: comparisonValuesList,
      })
    : null,
});
