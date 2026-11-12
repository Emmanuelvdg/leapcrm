import { type IcpScoreFields } from 'src/modules/icp-analysis/scoring/types/icp-score-fields.type';

// Records with the same outcome are written in one update: every write emits
// webhook, trigger and timeline jobs, and many records share a score, such as
// all companies the model knows nothing about.
export const groupIcpScoreUpdates = (
  updates: { id: string; update: IcpScoreFields }[],
): { ids: string[]; update: IcpScoreFields }[] => {
  const groupsByOutcome = new Map<
    string,
    { ids: string[]; update: IcpScoreFields }
  >();

  for (const { id, update } of updates) {
    const outcomeKey = JSON.stringify(update);
    const group = groupsByOutcome.get(outcomeKey);

    if (group) {
      group.ids.push(id);
    } else {
      groupsByOutcome.set(outcomeKey, { ids: [id], update });
    }
  }

  return [...groupsByOutcome.values()];
};
