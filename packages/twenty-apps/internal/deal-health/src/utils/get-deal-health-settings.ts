import {
  CLOSED_STAGES_VARIABLE_NAME,
  DEFAULT_CLOSED_STAGES,
  DEFAULT_STALLED_AFTER_DAYS,
  STALLED_AFTER_DAYS_VARIABLE_NAME,
} from 'src/constants/deal-health-settings';
import { type DealHealthSettings } from 'src/utils/compute-deal-health';

// Application variables are injected into process.env on every execution.
const readStalledAfterDays = (): number => {
  const parsedValue = Number(process.env[STALLED_AFTER_DAYS_VARIABLE_NAME]);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : DEFAULT_STALLED_AFTER_DAYS;
};

const readClosedStages = (): string[] => {
  const closedStages = (process.env[CLOSED_STAGES_VARIABLE_NAME] ?? '')
    .split(',')
    .map((stage) => stage.trim())
    .filter((stage) => stage.length > 0);

  return closedStages.length > 0 ? closedStages : DEFAULT_CLOSED_STAGES;
};

export const getDealHealthSettings = (): DealHealthSettings => ({
  stalledAfterDays: readStalledAfterDays(),
  closedStages: readClosedStages(),
});
