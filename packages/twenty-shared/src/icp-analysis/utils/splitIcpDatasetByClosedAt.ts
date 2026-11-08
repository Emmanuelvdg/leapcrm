import { type IcpDatasetRow } from '@/icp-analysis/types/IcpDatasetRow';

const DEFAULT_TRAINING_SHARE = 0.7;

const getClosedAtTime = ({ closedAt }: IcpDatasetRow): number => {
  const closedAtTime = Date.parse(closedAt);

  return Number.isNaN(closedAtTime) ? Number.MIN_SAFE_INTEGER : closedAtTime;
};

// Testing on the newest deals mirrors how the model is used: built from the
// past, scoring what comes next.
export const splitIcpDatasetByClosedAt = ({
  rows,
  trainingShare = DEFAULT_TRAINING_SHARE,
}: {
  rows: IcpDatasetRow[];
  trainingShare?: number;
}): { trainingRows: IcpDatasetRow[]; testRows: IcpDatasetRow[] } => {
  const sortedRows = [...rows].sort(
    (first, second) =>
      getClosedAtTime(first) - getClosedAtTime(second) ||
      first.id.localeCompare(second.id),
  );

  const trainingCount = Math.min(
    Math.max(rows.length - 1, 0),
    Math.max(1, Math.round(rows.length * trainingShare)),
  );

  return {
    trainingRows: sortedRows.slice(0, trainingCount),
    testRows: sortedRows.slice(trainingCount),
  };
};
