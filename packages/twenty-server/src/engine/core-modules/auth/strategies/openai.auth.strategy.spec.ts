import { type Request } from 'express';
import { Issuer, type TokenSet } from 'openid-client';

import {
  OpenAIAuthStrategy,
  type OpenAIRequest,
} from 'src/engine/core-modules/auth/strategies/openai.auth.strategy';

const buildClient = () => {
  const issuer = new Issuer({
    issuer: 'https://auth.openai.com',
    authorization_endpoint: 'https://auth.openai.com/api/accounts/authorize',
    token_endpoint: 'https://auth.openai.com/api/accounts/oauth/token',
    jwks_uri: 'https://auth.openai.com/.well-known/jwks.json',
  });

  return new issuer.Client({
    client_id: 'client-id',
    token_endpoint_auth_method: 'none',
    redirect_uris: ['https://leapcrm.tech/auth/openai/redirect'],
    response_types: ['code'],
  });
};

const buildRequest = (state: object): Request =>
  ({ query: { state: JSON.stringify(state) } }) as unknown as Request;

const buildTokenSet = (claims: Record<string, unknown>): TokenSet =>
  ({ claims: () => claims }) as unknown as TokenSet;

const runValidate = async (
  strategy: OpenAIAuthStrategy,
  request: Request,
  tokenSet: TokenSet,
): Promise<{ error: unknown; user?: OpenAIRequest['user'] }> => {
  let outcome: { error: unknown; user?: OpenAIRequest['user'] } = {
    error: undefined,
  };

  await strategy.validate(request, tokenSet, (error, user) => {
    outcome = { error, user };
  });

  return outcome;
};

describe('OpenAIAuthStrategy', () => {
  const strategy = new OpenAIAuthStrategy(buildClient());

  it('maps ID token claims and the round-tripped state to a sign-in user', async () => {
    const { error, user } = await runValidate(
      strategy,
      buildRequest({
        action: 'create-new-workspace',
        workspaceInviteHash: 'invite-hash',
        returnToPath: '/objects/people',
      }),
      buildTokenSet({
        email: 'jane@acme.com',
        email_verified: true,
        given_name: 'Jane',
        family_name: 'Tan',
        picture: 'https://example.com/jane.png',
      }),
    );

    expect(error).toBeNull();
    expect(user).toEqual({
      email: 'jane@acme.com',
      firstName: 'Jane',
      lastName: 'Tan',
      picture: 'https://example.com/jane.png',
      workspaceInviteHash: 'invite-hash',
      workspaceId: undefined,
      billingCheckoutSessionState: undefined,
      action: 'create-new-workspace',
      locale: undefined,
      returnToPath: '/objects/people',
    });
  });

  it('splits a display name when given and family names are absent', async () => {
    const { user } = await runValidate(
      strategy,
      buildRequest({}),
      buildTokenSet({ email: 'jane@acme.com', name: 'Jane van Tan' }),
    );

    expect(user).toMatchObject({
      firstName: 'Jane',
      lastName: 'van Tan',
      picture: null,
      action: 'list-available-workspaces',
    });
  });

  it('rejects an account whose email is not verified', async () => {
    const { error, user } = await runValidate(
      strategy,
      buildRequest({}),
      buildTokenSet({ email: 'jane@acme.com', email_verified: false }),
    );

    expect(user).toBeUndefined();
    expect(error).toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
  });
});
