// Cursors and counters only; anything larger belongs in workspace records.
export type ProspectingJobPayload = Record<
  string,
  string | number | boolean | null
>;
