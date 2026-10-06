import { HEALTH_STATUS, type HealthStatus } from 'src/constants/health-status';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type DealHealthInput = {
  stage: string | null;
  closeDate: string | null;
  stageChangedAt: string | null;
  openTaskCount: number;
};

export type DealHealthSettings = {
  stalledAfterDays: number;
  closedStages: string[];
};

export type DealHealth = {
  healthStatus: HealthStatus | null;
  healthReasons: string | null;
};

const wholeDaysBetween = (from: Date, to: Date): number =>
  Math.floor((to.getTime() - from.getTime()) / DAY_IN_MS);

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const formatDate = (date: Date): string =>
  `${date.getUTCDate()} ${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;

export const computeDealHealth = (
  input: DealHealthInput,
  settings: DealHealthSettings,
  now: Date,
): DealHealth => {
  if (input.stage !== null && settings.closedStages.includes(input.stage)) {
    return { healthStatus: null, healthReasons: null };
  }

  // Reasons name fixed dates rather than day counts so the text, and with it
  // the record, only changes when the deal does, not every night.
  const reasons: string[] = [];

  let isOverdue = false;

  if (input.closeDate === null) {
    reasons.push('No close date');
  } else {
    const daysPastCloseDate = wholeDaysBetween(new Date(input.closeDate), now);

    if (daysPastCloseDate > 0) {
      isOverdue = true;
      reasons.push(
        `Close date passed (${formatDate(new Date(input.closeDate))})`,
      );
    }
  }

  let isStalled = false;

  if (input.stageChangedAt !== null) {
    const daysInStage = wholeDaysBetween(new Date(input.stageChangedAt), now);

    if (daysInStage >= settings.stalledAfterDays) {
      isStalled = true;
      reasons.push(
        `In this stage since ${formatDate(new Date(input.stageChangedAt))}`,
      );
    }
  }

  const hasNoNextStep = input.openTaskCount === 0;

  if (hasNoNextStep) {
    reasons.push('No open task');
  }

  if (reasons.length === 0) {
    return { healthStatus: HEALTH_STATUS.HEALTHY, healthReasons: null };
  }

  const isAtRisk = isOverdue || (isStalled && hasNoNextStep);

  return {
    healthStatus: isAtRisk ? HEALTH_STATUS.AT_RISK : HEALTH_STATUS.WATCH,
    healthReasons: reasons.join(' · '),
  };
};
