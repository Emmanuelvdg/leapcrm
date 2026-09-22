import { defineApplication } from 'twenty-sdk/define';

import {
  APPLICATION_UNIVERSAL_IDENTIFIER,
  DISCORD_BOT_TOKEN_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'Discord',
  description:
    'Connect Discord to LeapCRM. Workflow steps post, update, and delete bot messages and add reactions using a Discord bot token shared across the deployment.',
  logoUrl: 'public/twenty-discord.svg',
  author: 'Leap',
  category: 'Communication',
  websiteUrl:
    'https://docs.theleapcrm.com/developers/extend/apps/getting-started',
  termsUrl: 'https://theleapcrm.com/terms',
  emailSupport: 'support@theleapcrm.com',
  applicationVariables: {
    DISCORD_BOT_TOKEN: {
      universalIdentifier: DISCORD_BOT_TOKEN_VARIABLE_UNIVERSAL_IDENTIFIER,
      description:
        'Bot token from your Discord application (Developer Portal → Bot tab → Reset Token). Used with the `Bot` auth prefix to call the Discord REST API. The same token authenticates the bot across every guild it has been invited to.',
      isSecret: true,
    },
  },
});
