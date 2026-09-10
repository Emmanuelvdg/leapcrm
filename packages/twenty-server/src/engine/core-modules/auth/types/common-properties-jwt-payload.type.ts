export type CommonPropertiesJwtPayload = {
  sub: string;
  // ISO timestamp of the original real-credential login this token chain
  // descends from — carried forward unchanged across silent refresh-token
  // renewals so the cross-domain auto-login window can't be perpetually
  // re-opened by background renewal. Defaults to "now" when a token is
  // minted directly from a real sign-in/sign-up.
  authenticatedAt?: string;
};
