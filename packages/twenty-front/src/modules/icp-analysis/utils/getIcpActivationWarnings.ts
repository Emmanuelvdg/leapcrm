import { type IcpBacktestResult } from 'twenty-shared/icp-analysis';
import { isDefined } from 'twenty-shared/utils';

export type IcpActivationWarning =
  | 'PRIORITY_NOT_ABOVE_BASELINE'
  | 'WEAK_SEPARATION';

// Activation is never blocked; these are the back-test results worth a second
// look before scores reach every company.
export const getIcpActivationWarnings = (
  backtest: IcpBacktestResult | null,
): IcpActivationWarning[] => {
  if (!isDefined(backtest)) {
    return [];
  }

  const { doesPriorityBeatBaseline, isAucBelowActivationThreshold } =
    backtest.inSample;

  return [
    ...(doesPriorityBeatBaseline === false
      ? (['PRIORITY_NOT_ABOVE_BASELINE'] as const)
      : []),
    ...(isAucBelowActivationThreshold === true
      ? (['WEAK_SEPARATION'] as const)
      : []),
  ];
};
