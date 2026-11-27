import {
  type DealCoachSettings,
  isClosedStage,
} from 'src/utils/get-deal-coach-settings';

export type ActivitySignal = {
  opportunityId: string | null;
  personId: string | null;
  companyId: string | null;
  at: string;
  // Stage changes can close a deal; the refresh then clears its suggestion.
  canCloseDeal: boolean;
};

export type CandidateDeal = {
  id: string;
  stage: string | null;
  pointOfContactId: string | null;
  companyId: string | null;
  nextBestActionUpdatedAt: string | null;
};

const signalMatchesDeal = (signal: ActivitySignal, deal: CandidateDeal) =>
  signal.opportunityId === deal.id ||
  (signal.personId !== null && signal.personId === deal.pointOfContactId) ||
  (signal.companyId !== null && signal.companyId === deal.companyId);

export const selectDealsToRefresh = ({
  signals,
  deals,
  settings,
}: {
  signals: ActivitySignal[];
  deals: CandidateDeal[];
  settings: DealCoachSettings;
}): string[] => {
  const dealsWithActivity: { id: string; latestActivityAt: string }[] = [];

  for (const deal of deals) {
    const matchingSignals = signals.filter((signal) =>
      signalMatchesDeal(signal, deal),
    );

    if (matchingSignals.length === 0) {
      continue;
    }

    if (isClosedStage(deal.stage, settings)) {
      const hasSuggestionToClear = deal.nextBestActionUpdatedAt !== null;
      const wasClosedJustNow = matchingSignals.some(
        (signal) => signal.canCloseDeal && signal.opportunityId === deal.id,
      );

      if (hasSuggestionToClear && wasClosedJustNow) {
        dealsWithActivity.push({
          id: deal.id,
          latestActivityAt: matchingSignals[0].at,
        });
      }

      continue;
    }

    const latestActivityAt = matchingSignals
      .map((signal) => signal.at)
      .reduce((latest, at) => (at > latest ? at : latest));

    if (
      deal.nextBestActionUpdatedAt !== null &&
      deal.nextBestActionUpdatedAt >= latestActivityAt
    ) {
      continue;
    }

    dealsWithActivity.push({ id: deal.id, latestActivityAt });
  }

  // Oldest activity first: it is the closest to leaving the lookback window.
  return dealsWithActivity
    .sort((first, second) =>
      first.latestActivityAt.localeCompare(second.latestActivityAt),
    )
    .slice(0, settings.maxDealsPerRun)
    .map((deal) => deal.id);
};

export const isRecentEnough = ({
  at,
  now,
  maxAgeHours,
}: {
  at: string | null;
  now: Date;
  maxAgeHours: number;
}): boolean =>
  at !== null && now.getTime() - Date.parse(at) <= maxAgeHours * 60 * 60 * 1000;

export const hasStageOrCloseDateChange = (properties: unknown): boolean => {
  if (typeof properties !== 'object' || properties === null) {
    return false;
  }

  const diff = (properties as { diff?: unknown }).diff;

  return (
    typeof diff === 'object' &&
    diff !== null &&
    ('stage' in diff || 'closeDate' in diff)
  );
};
