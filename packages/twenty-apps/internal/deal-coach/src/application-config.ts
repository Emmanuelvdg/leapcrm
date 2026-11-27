import { defineApplication, FieldType } from 'twenty-sdk/define';

import {
  CLOSED_STAGES_VARIABLE_NAME,
  DEFAULT_CLOSED_STAGES,
  DEFAULT_MAX_DEALS_PER_RUN,
  DEFAULT_REFRESH_AFTER_DAYS,
  MAX_DEALS_PER_RUN_VARIABLE_NAME,
  REFRESH_AFTER_DAYS_VARIABLE_NAME,
} from 'src/constants/deal-coach-settings';
import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APPLICATION_UNIVERSAL_IDENTIFIER,
  CLOSED_STAGES_VARIABLE_UNIVERSAL_IDENTIFIER,
  MAX_DEALS_PER_RUN_VARIABLE_UNIVERSAL_IDENTIFIER,
  REFRESH_AFTER_DAYS_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  author: 'Your Jugaad',
  category: 'Productivity',
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  applicationVariables: {
    [CLOSED_STAGES_VARIABLE_NAME]: {
      universalIdentifier: CLOSED_STAGES_VARIABLE_UNIVERSAL_IDENTIFIER,
      description:
        'Comma-separated stage values that mean the deal is finished (won or lost). Closed deals get no suggestions and their suggestion is cleared.',
      type: FieldType.TEXT,
      value: DEFAULT_CLOSED_STAGES.join(','),
      isSecret: false,
    },
    [REFRESH_AFTER_DAYS_VARIABLE_NAME]: {
      universalIdentifier: REFRESH_AFTER_DAYS_VARIABLE_UNIVERSAL_IDENTIFIER,
      description:
        'The nightly run refreshes open deals whose suggestion is older than this many days, even without new activity.',
      type: FieldType.NUMBER,
      value: DEFAULT_REFRESH_AFTER_DAYS,
      isSecret: false,
    },
    [MAX_DEALS_PER_RUN_VARIABLE_NAME]: {
      universalIdentifier: MAX_DEALS_PER_RUN_VARIABLE_UNIVERSAL_IDENTIFIER,
      description:
        'Most deals one automatic run sends to the AI agent. Caps AI credit use; deals left over are picked up by later runs.',
      type: FieldType.NUMBER,
      value: DEFAULT_MAX_DEALS_PER_RUN,
      isSecret: false,
    },
  },
});
