import {
  CLOSED_STAGES_VARIABLE_NAME,
  DEFAULT_CLOSED_STAGES,
  DEFAULT_MAX_DEALS_PER_RUN,
  DEFAULT_REFRESH_AFTER_DAYS,
  MAX_DEALS_PER_RUN_VARIABLE_NAME,
  REFRESH_AFTER_DAYS_VARIABLE_NAME,
} from 'src/constants/deal-coach-settings';

export type DealCoachSettings = {
  closedStages: string[];
  refreshAfterDays: number;
  maxDealsPerRun: number;
};

const readPositiveInteger = (
  variableName: string,
  defaultValue: number,
): number => {
  const parsedValue = Number(process.env[variableName]);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : defaultValue;
};

const readClosedStages = (): string[] => {
  const closedStages = (process.env[CLOSED_STAGES_VARIABLE_NAME] ?? '')
    .split(',')
    .map((stage) => stage.trim())
    .filter((stage) => stage.length > 0);

  return closedStages.length > 0 ? closedStages : DEFAULT_CLOSED_STAGES;
};

// Application variables are injected into process.env on every execution.
export const getDealCoachSettings = (): DealCoachSettings => ({
  closedStages: readClosedStages(),
  refreshAfterDays: readPositiveInteger(
    REFRESH_AFTER_DAYS_VARIABLE_NAME,
    DEFAULT_REFRESH_AFTER_DAYS,
  ),
  maxDealsPerRun: readPositiveInteger(
    MAX_DEALS_PER_RUN_VARIABLE_NAME,
    DEFAULT_MAX_DEALS_PER_RUN,
  ),
});

export const isClosedStage = (
  stage: string | null,
  settings: DealCoachSettings,
): boolean => stage !== null && settings.closedStages.includes(stage);
