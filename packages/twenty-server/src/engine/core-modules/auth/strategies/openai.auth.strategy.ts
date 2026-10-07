import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { isNonEmptyString } from '@sniptt/guards';
import { type Request } from 'express';
import { Strategy, type StrategyOptions, type TokenSet } from 'openid-client';
import { type APP_LOCALES } from 'twenty-shared/translations';
import { parseJson } from 'twenty-shared/utils';

import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { type SocialSSOSignInUpActionType } from 'src/engine/core-modules/auth/types/signInUp.type';
import { type SocialSSOState } from 'src/engine/core-modules/auth/types/social-sso-state.type';

export const OPENAI_STRATEGY_NAME = 'openai';

export type OpenAIRequest = Omit<
  Request,
  'user' | 'workspace' | 'workspaceMetadataVersion'
> & {
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    picture: string | null;
    locale?: keyof typeof APP_LOCALES | null;
    workspaceInviteHash?: string;
    action: SocialSSOSignInUpActionType;
    workspaceId?: string;
    billingCheckoutSessionState?: string;
    returnToPath?: string;
  };
};

type OpenAIIdentityClaims = {
  email?: unknown;
  email_verified?: unknown;
  given_name?: unknown;
  family_name?: unknown;
  name?: unknown;
  picture?: unknown;
};

const toOptionalString = (value: unknown): string | undefined =>
  isNonEmptyString(value) ? value : undefined;

// OpenAI may only provide a display name; split it so new users still get a
// first and last name like with the other social providers.
const resolveNames = (
  claims: OpenAIIdentityClaims,
): { firstName?: string; lastName?: string } => {
  const givenName = toOptionalString(claims.given_name);
  const familyName = toOptionalString(claims.family_name);

  if (givenName || familyName) {
    return { firstName: givenName, lastName: familyName };
  }

  const [firstName, ...otherNames] = (toOptionalString(claims.name) ?? '')
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);

  return {
    firstName,
    lastName: otherNames.length > 0 ? otherNames.join(' ') : undefined,
  };
};

@Injectable()
export class OpenAIAuthStrategy extends PassportStrategy(
  Strategy,
  OPENAI_STRATEGY_NAME,
) {
  constructor(private readonly client: StrategyOptions['client']) {
    super({
      client,
      params: {
        scope: 'openid email profile',
        code_challenge_method: 'S256',
      },
      usePKCE: true,
      passReqToCallback: true,
      sessionKey: `oidc:${OPENAI_STRATEGY_NAME}`,
    });
  }

  // openid-client forwards every option it receives as an authorization
  // parameter, so Nest's guard options (session, property) are not passed on.
  authenticate(req: Request) {
    return super.authenticate(req, {
      state: JSON.stringify({
        workspaceInviteHash: req.query.workspaceInviteHash,
        workspaceId: req.params.workspaceId,
        billingCheckoutSessionState: req.query.billingCheckoutSessionState,
        action: req.query.action,
        locale: req.query.locale,
        returnToPath: req.query.returnToPath,
      }),
    });
  }

  async validate(
    req: Request,
    tokenset: TokenSet,
    // oxlint-disable-next-line typescript/no-explicit-any
    done: (err: any, user?: OpenAIRequest['user']) => void,
  ) {
    try {
      const idTokenClaims = tokenset.claims() as OpenAIIdentityClaims;
      const claims: OpenAIIdentityClaims = isNonEmptyString(idTokenClaims.email)
        ? idTokenClaims
        : {
            ...idTokenClaims,
            ...((await this.client.userinfo(tokenset)) as OpenAIIdentityClaims),
          };

      const email = toOptionalString(claims.email);

      if (!email) {
        throw new AuthException(
          'Email not found in ChatGPT account',
          AuthExceptionCode.INVALID_DATA,
        );
      }

      if (claims.email_verified === false) {
        throw new AuthException(
          'Please verify your email address with ChatGPT',
          AuthExceptionCode.EMAIL_NOT_VERIFIED,
        );
      }

      const state = parseJson<SocialSSOState>(req.query.state as string);

      done(null, {
        email,
        ...resolveNames(claims),
        picture: toOptionalString(claims.picture) ?? null,
        workspaceInviteHash: state?.workspaceInviteHash,
        workspaceId: state?.workspaceId,
        billingCheckoutSessionState: state?.billingCheckoutSessionState,
        action: state?.action ?? 'list-available-workspaces',
        locale: state?.locale,
        returnToPath: state?.returnToPath,
      });
    } catch (error) {
      done(error);
    }
  }
}
