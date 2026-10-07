import { isOpenAISignInAvailable } from 'src/engine/core-modules/auth/utils/is-openai-sign-in-available.util';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

const buildConfig = (values: Record<string, unknown>) =>
  ({
    get: (key: string) => values[key],
  }) as unknown as TwentyConfigService;

describe('isOpenAISignInAvailable', () => {
  it('is available when enabled with a client ID', () => {
    expect(
      isOpenAISignInAvailable(
        buildConfig({
          AUTH_OPENAI_ENABLED: true,
          AUTH_OPENAI_CLIENT_ID: 'client-id',
        }),
      ),
    ).toBe(true);
  });

  it('stays hidden while OpenAI has not issued a client ID', () => {
    expect(
      isOpenAISignInAvailable(
        buildConfig({ AUTH_OPENAI_ENABLED: true, AUTH_OPENAI_CLIENT_ID: '' }),
      ),
    ).toBe(false);
  });

  it('stays hidden when switched off', () => {
    expect(
      isOpenAISignInAvailable(
        buildConfig({
          AUTH_OPENAI_ENABLED: false,
          AUTH_OPENAI_CLIENT_ID: 'client-id',
        }),
      ),
    ).toBe(false);
  });
});
