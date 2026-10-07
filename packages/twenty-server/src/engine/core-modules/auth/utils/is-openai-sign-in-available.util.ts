import { isNonEmptyString } from '@sniptt/guards';

import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

// OpenAI only issues client IDs to approved partners, so the button stays
// hidden until one is configured even if the flag was switched on early.
export const isOpenAISignInAvailable = (
  twentyConfigService: TwentyConfigService,
): boolean =>
  twentyConfigService.get('AUTH_OPENAI_ENABLED') === true &&
  isNonEmptyString(twentyConfigService.get('AUTH_OPENAI_CLIENT_ID'));
