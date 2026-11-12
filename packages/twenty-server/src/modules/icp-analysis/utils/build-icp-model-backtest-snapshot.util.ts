import {
  type IcpBacktestResult,
  type IcpModelEvaluation,
} from 'twenty-shared/icp-analysis';
import { isDefined } from 'twenty-shared/utils';

import {
  type IcpModelBacktestSnapshot,
  type IcpModelEvaluationSnapshot,
} from 'src/modules/icp-analysis/types/icp-model-backtest-snapshot.type';

// Keeps the figures, not the scored deals: the record is read on every page
// load and the deals can be recomputed from the evidence when needed.
const toEvaluationSnapshot = (
  evaluation: IcpModelEvaluation,
): IcpModelEvaluationSnapshot => ({
  totalCount: evaluation.totalCount,
  wonCount: evaluation.wonCount,
  lostCount: evaluation.lostCount,
  baselineWinRate: evaluation.baselineWinRate,
  tiers: evaluation.tiers,
  auc: evaluation.auc,
  wonBelowTargetCount: evaluation.wonBelowTarget.length,
  lostInPriorityCount: evaluation.lostInPriority.length,
  doesPriorityBeatBaseline: evaluation.doesPriorityBeatBaseline,
  isAucBelowActivationThreshold: evaluation.isAucBelowActivationThreshold,
});

export const buildIcpModelBacktestSnapshot = ({
  backtest,
  computedAt,
}: {
  backtest: IcpBacktestResult;
  computedAt: Date;
}): IcpModelBacktestSnapshot => ({
  computedAt: computedAt.toISOString(),
  inSample: toEvaluationSnapshot(backtest.inSample),
  holdout: isDefined(backtest.holdout)
    ? {
        trainingCount: backtest.holdout.trainingCount,
        testCount: backtest.holdout.testCount,
        evaluation: toEvaluationSnapshot(backtest.holdout.evaluation),
      }
    : null,
});
