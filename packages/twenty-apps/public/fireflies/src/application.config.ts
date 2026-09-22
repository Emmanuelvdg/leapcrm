import { defineApplication } from 'twenty-sdk/define';

import {
  APPLICATION_UNIVERSAL_IDENTIFIER,
  FIREFLIES_API_KEY_VARIABLE_UNIVERSAL_IDENTIFIER,
  FIREFLIES_WEBHOOK_SECRET_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'Fireflies',
  description:
    'Sync Fireflies call transcripts and AI summaries into CallRecording records linked to matching CalendarEvents in LeapCRM, and trigger sync / list / search of Fireflies calls from workflows and the AI chat.',
  logoUrl: 'public/twenty-fireflies.svg',
  author: 'Leap',
  category: 'Productivity',
  screenshots: [
    'public/gallery/workflow-builder-actions.png',
    'public/gallery/app-settings.png',
  ],
  websiteUrl:
    'https://docs.theleapcrm.com/developers/extend/apps/getting-started',
  termsUrl: 'https://theleapcrm.com/terms',
  emailSupport: 'support@theleapcrm.com',
  applicationVariables: {
    FIREFLIES_API_KEY: {
      universalIdentifier: FIREFLIES_API_KEY_VARIABLE_UNIVERSAL_IDENTIFIER,
      description:
        'Your Fireflies API key (Fireflies → Integrations → Fireflies API).',
      isSecret: true,
    },
    FIREFLIES_WEBHOOK_SECRET: {
      universalIdentifier:
        FIREFLIES_WEBHOOK_SECRET_VARIABLE_UNIVERSAL_IDENTIFIER,
      description: 'Signing secret from the Fireflies Webhooks V2 setup page.',
      isSecret: true,
    },
  },
});
