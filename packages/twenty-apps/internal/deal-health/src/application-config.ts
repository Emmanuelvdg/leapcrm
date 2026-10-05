import { defineApplication, FieldType } from 'twenty-sdk/define';

import {
  CLOSED_STAGES_VARIABLE_NAME,
  DEFAULT_CLOSED_STAGES,
  DEFAULT_STALLED_AFTER_DAYS,
  STALLED_AFTER_DAYS_VARIABLE_NAME,
} from 'src/constants/deal-health-settings';
import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APPLICATION_UNIVERSAL_IDENTIFIER,
  CLOSED_STAGES_VARIABLE_UNIVERSAL_IDENTIFIER,
  STALLED_AFTER_DAYS_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  author: 'Leap',
  category: 'Productivity',
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  applicationVariables: {
    [STALLED_AFTER_DAYS_VARIABLE_NAME]: {
      universalIdentifier: STALLED_AFTER_DAYS_VARIABLE_UNIVERSAL_IDENTIFIER,
      description:
        'How many days a deal can stay in the same stage before it is flagged as stalled.',
      type: FieldType.NUMBER,
      value: DEFAULT_STALLED_AFTER_DAYS,
      isSecret: false,
    },
    [CLOSED_STAGES_VARIABLE_NAME]: {
      universalIdentifier: CLOSED_STAGES_VARIABLE_UNIVERSAL_IDENTIFIER,
      description:
        'Comma-separated stage values that mean the deal is finished (won or lost). Deals in these stages are not scored.',
      type: FieldType.TEXT,
      value: DEFAULT_CLOSED_STAGES.join(','),
      isSecret: false,
    },
  },
});
