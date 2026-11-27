import {
  enqueueSnackbar,
  openSidePanelPage,
  SidePanelPages,
} from 'twenty-sdk/front-component';

import { type NextBestActionRecord } from 'src/front-components/hooks/use-next-best-action';
import { findConnectedAccount } from 'src/front-components/utils/find-connected-account';
import { plainTextToEmailHtml } from 'src/utils/plain-text-to-email-html';

type ComposeEmailParams = Parameters<typeof openSidePanelPage>[0] & {
  // The host accepts a starting body, but the published SDK types do not
  // list it yet.
  defaultBody?: string;
};

export const openEmailDraft = async (
  record: NextBestActionRecord,
): Promise<void> => {
  try {
    const connectedAccount = await findConnectedAccount();

    if (!connectedAccount) {
      await enqueueSnackbar({
        message:
          'Connect your mailbox in Settings > Accounts to send email from the CRM.',
        variant: 'info',
      });

      return;
    }

    const params: ComposeEmailParams = {
      page: SidePanelPages.ComposeEmail,
      connectedAccountId: connectedAccount.id,
      defaultTo: record.contact?.email ?? undefined,
      defaultSubject: record.nextBestActionDetails?.emailSubject ?? undefined,
      defaultBody: plainTextToEmailHtml(record.nextBestActionDraft ?? ''),
      pageTitle: 'Follow-up email',
      pageIcon: 'IconMail',
    };

    await openSidePanelPage(params);
  } catch {
    await enqueueSnackbar({
      message: 'Could not open the email composer.',
      variant: 'error',
    });
  }
};
