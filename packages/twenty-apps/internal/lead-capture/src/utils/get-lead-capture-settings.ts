import {
  CLOSED_STAGES_VARIABLE_NAME,
  DEFAULT_CLOSED_STAGES,
  DEFAULT_PHONE_COUNTRY,
  DEFAULT_PHONE_COUNTRY_VARIABLE_NAME,
} from 'src/constants/lead-capture-settings';

export type LeadCaptureSettings = {
  defaultPhoneCountry: string;
  closedStages: string[];
};

// Application variables are injected into process.env on every execution.
export const getLeadCaptureSettings = (): LeadCaptureSettings => {
  const phoneCountry = (process.env[DEFAULT_PHONE_COUNTRY_VARIABLE_NAME] ?? '')
    .trim()
    .toUpperCase();
  const closedStages = (process.env[CLOSED_STAGES_VARIABLE_NAME] ?? '')
    .split(',')
    .map((stage) => stage.trim())
    .filter((stage) => stage.length > 0);

  return {
    defaultPhoneCountry: /^[A-Z]{2}$/.test(phoneCountry)
      ? phoneCountry
      : DEFAULT_PHONE_COUNTRY,
    closedStages:
      closedStages.length > 0 ? closedStages : DEFAULT_CLOSED_STAGES,
  };
};
