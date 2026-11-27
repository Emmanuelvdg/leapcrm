import { defineApplication, FieldType } from 'twenty-sdk/define';

import {
  CLOSED_STAGES_VARIABLE_NAME,
  DEFAULT_CLOSED_STAGES,
  DEFAULT_PHONE_COUNTRY,
  DEFAULT_PHONE_COUNTRY_VARIABLE_NAME,
} from 'src/constants/lead-capture-settings';
import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APPLICATION_UNIVERSAL_IDENTIFIER,
  CLOSED_STAGES_VARIABLE_UNIVERSAL_IDENTIFIER,
  DEFAULT_PHONE_COUNTRY_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  author: 'Your Jugaad',
  category: 'Sales',
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  applicationVariables: {
    [DEFAULT_PHONE_COUNTRY_VARIABLE_NAME]: {
      universalIdentifier: DEFAULT_PHONE_COUNTRY_VARIABLE_UNIVERSAL_IDENTIFIER,
      description:
        'Two-letter country code used for phone numbers typed without a "+" country code, e.g. IN.',
      type: FieldType.TEXT,
      value: DEFAULT_PHONE_COUNTRY,
      isSecret: false,
    },
    [CLOSED_STAGES_VARIABLE_NAME]: {
      universalIdentifier: CLOSED_STAGES_VARIABLE_UNIVERSAL_IDENTIFIER,
      description:
        'Comma-separated stage values that mean a deal is finished. A contact with only finished deals gets a new deal when they write in again.',
      type: FieldType.TEXT,
      value: DEFAULT_CLOSED_STAGES.join(','),
      isSecret: false,
    },
  },
});
