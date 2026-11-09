import { isDefined } from 'twenty-shared/utils';

import { type IcpModelAnalysisSnapshot } from 'src/modules/icp-analysis/types/icp-model-analysis-snapshot.type';

// The snapshot is only ever written by the analysis service; this guards
// against records edited through the API or written by an older version.
export const isIcpModelAnalysisSnapshot = (
  value: unknown,
): value is IcpModelAnalysisSnapshot => {
  if (typeof value !== 'object' || !isDefined(value)) {
    return false;
  }

  const { attributes, patterns } = value as Partial<
    Record<keyof IcpModelAnalysisSnapshot, unknown>
  >;

  return (
    Array.isArray(attributes) &&
    typeof patterns === 'object' &&
    isDefined(patterns) &&
    Array.isArray((patterns as { attributes?: unknown }).attributes)
  );
};
