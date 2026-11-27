import { MetadataApiClient } from 'twenty-client-sdk/metadata';

type ConnectedAccountNode = {
  id: string;
  provider: string;
  handle: string;
  authFailedAt: string | null;
  archivedAt: string | null;
};

// Mailbox and calendar providers; WhatsApp numbers are connected accounts too
// but can neither send email nor hold calendar events.
const EMAIL_AND_CALENDAR_PROVIDERS = [
  'google',
  'microsoft',
  'imap_smtp_caldav',
];

// Front components call the API as the signed-in user, so "my" accounts are
// the rep's own mailboxes and calendars.
export const findConnectedAccount = async (): Promise<
  ConnectedAccountNode | undefined
> => {
  const { myConnectedAccounts } = await new MetadataApiClient().query({
    myConnectedAccounts: {
      id: true,
      provider: true,
      handle: true,
      authFailedAt: true,
      archivedAt: true,
    },
  });

  return ((myConnectedAccounts ?? []) as ConnectedAccountNode[]).find(
    (account) =>
      EMAIL_AND_CALENDAR_PROVIDERS.includes(account.provider) &&
      account.archivedAt === null &&
      account.authFailedAt === null,
  );
};
