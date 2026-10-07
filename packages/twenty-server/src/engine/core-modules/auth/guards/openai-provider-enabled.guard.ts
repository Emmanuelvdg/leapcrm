import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { Issuer } from 'openid-client';

import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { OpenAIAuthStrategy } from 'src/engine/core-modules/auth/strategies/openai.auth.strategy';
import { GuardRedirectService } from 'src/engine/core-modules/guard-redirect/services/guard-redirect.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class OpenAIProviderEnabledGuard implements CanActivate {
  // Discovery is a network round trip to OpenAI; the issuer document is
  // stable, so it is fetched once per process and reused.
  private issuerPromise: Promise<Issuer> | null = null;

  constructor(
    private readonly twentyConfigService: TwentyConfigService,
    private readonly guardRedirectService: GuardRedirectService,
  ) {}

  private discoverIssuer(issuerUrl: string): Promise<Issuer> {
    if (!this.issuerPromise) {
      this.issuerPromise = Issuer.discover(issuerUrl).catch((error) => {
        this.issuerPromise = null;
        throw error;
      });
    }

    return this.issuerPromise;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const clientId = this.twentyConfigService.get('AUTH_OPENAI_CLIENT_ID');

      if (
        !this.twentyConfigService.get('AUTH_OPENAI_ENABLED') ||
        !isNonEmptyString(clientId)
      ) {
        throw new AuthException(
          'Sign in with ChatGPT is not enabled',
          AuthExceptionCode.OPENAI_AUTH_DISABLED,
        );
      }

      const clientSecret = this.twentyConfigService.get(
        'AUTH_OPENAI_CLIENT_SECRET',
      );
      const issuer = await this.discoverIssuer(
        this.twentyConfigService.get('AUTH_OPENAI_ISSUER'),
      );

      new OpenAIAuthStrategy(
        new issuer.Client({
          client_id: clientId,
          ...(isNonEmptyString(clientSecret)
            ? {
                client_secret: clientSecret,
                token_endpoint_auth_method: 'client_secret_basic',
              }
            : { token_endpoint_auth_method: 'none' }),
          redirect_uris: [
            this.twentyConfigService.get('AUTH_OPENAI_CALLBACK_URL'),
          ],
          response_types: ['code'],
        }),
      );

      return true;
    } catch (error) {
      this.guardRedirectService.dispatchErrorFromGuard(
        context,
        error,
        this.guardRedirectService.getSubdomainAndCustomDomainFromContext(
          context,
        ),
      );

      return false;
    }
  }
}
