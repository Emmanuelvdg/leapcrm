import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import {
  copyToClipboard,
  enqueueSnackbar,
  openSidePanelPage,
  SidePanelPages,
} from 'twenty-sdk/front-component';

import { findConnectedAccount } from 'src/front-components/utils/find-connected-account';
import { formatDate, formatMoney } from 'src/utils/format-money';
import { plainTextToEmailHtml } from 'src/utils/plain-text-to-email-html';
import { type QuoteRecord } from 'src/utils/quote-records';

const CONVERSATIONS_WIDGET_TYPE = 'CONVERSATIONS';

type ComposeEmailParams = Parameters<typeof openSidePanelPage>[0] & {
  // The host accepts a starting body, but the published SDK types do not
  // list it yet.
  defaultBody?: string;
};

export const buildQuoteLink = (
  baseUrl: string,
  quote: Pick<QuoteRecord, 'id' | 'accessToken'>,
  isPreview = false,
): string =>
  `${baseUrl.replace(/\/+$/, '')}/s/quotes/view/${quote.id}?t=${encodeURIComponent(quote.accessToken ?? '')}${isPreview ? '&preview=1' : ''}`;

export const buildShareMessage = ({
  quote,
  link,
  sellerName,
}: {
  quote: QuoteRecord;
  link: string;
  sellerName: string | null;
}): string => {
  const firstName = quote.person?.name.split(' ')[0];

  return [
    `${firstName ? `Hi ${firstName},` : 'Hello,'}`,
    `Here is quote ${quote.quoteNumber ?? ''}${quote.name ? ` for ${quote.name}` : ''}, for ${formatMoney(quote.total.amountMicros, quote.currencyCode)}${quote.validUntil ? `, valid until ${formatDate(quote.validUntil)}` : ''}.`,
    `You can read it, download a PDF and accept it online here:\n${link}`,
    `Let me know if you have any questions.${sellerName ? `\n\n${sellerName}` : ''}`,
  ].join('\n\n');
};

export const emailQuote = async ({
  quote,
  message,
}: {
  quote: QuoteRecord;
  message: string;
}): Promise<void> => {
  try {
    const connectedAccount = await findConnectedAccount();

    if (!connectedAccount) {
      await copyToClipboard(message);
      await enqueueSnackbar({
        message:
          'No mailbox is connected, so the message was copied. Connect one in Settings > Accounts to email from the CRM.',
        variant: 'info',
      });

      return;
    }

    const params: ComposeEmailParams = {
      page: SidePanelPages.ComposeEmail,
      connectedAccountId: connectedAccount.id,
      defaultTo: quote.person?.email ?? undefined,
      defaultSubject: `Quote ${quote.quoteNumber ?? ''}${quote.name ? `: ${quote.name}` : ''}`,
      defaultBody: plainTextToEmailHtml(message),
      pageTitle: 'Send quote',
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

const findWhatsappConversationId = async (
  client: CoreApiClient,
  personId: string,
): Promise<string | undefined> => {
  const { conversations } = await client.query({
    conversations: {
      __args: {
        filter: { personId: { eq: personId } },
        orderBy: [{ lastMessageAt: 'DescNullsLast' }],
        first: 5,
      },
      edges: { node: { id: true, channelType: true } },
    },
  });

  return (
    (conversations?.edges ?? []) as {
      node: { id: string; channelType: string | null };
    }[]
  ).find((edge) => edge.node.channelType === 'WHATSAPP')?.node.id;
};

// Tab ids differ per workspace, so the person page tab holding the
// Conversations widget is looked up instead of hard-coded.
const findPersonConversationsTabId = async (): Promise<string | undefined> => {
  try {
    const metadataClient = new MetadataApiClient();

    const { objects } = await metadataClient.query({
      objects: {
        __args: { paging: { first: 1_000 }, filter: {} },
        edges: { node: { id: true, nameSingular: true } },
      },
    });

    const personObjectId = (
      (objects?.edges ?? []) as { node: { id: string; nameSingular: string } }[]
    ).find((edge) => edge.node.nameSingular === 'person')?.node.id;

    if (!personObjectId) {
      return undefined;
    }

    const { getPageLayouts } = await metadataClient.query({
      getPageLayouts: {
        __args: { objectMetadataId: personObjectId },
        id: true,
        tabs: { id: true, widgets: { type: true } },
      },
    });

    for (const pageLayout of (getPageLayouts ?? []) as {
      tabs: { id: string; widgets: { type: string }[] | null }[] | null;
    }[]) {
      const conversationsTab = (pageLayout.tabs ?? []).find((tab) =>
        (tab.widgets ?? []).some(
          (widget) => widget.type === CONVERSATIONS_WIDGET_TYPE,
        ),
      );

      if (conversationsTab) {
        return conversationsTab.id;
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
};

// With a WhatsApp chat already open, the message becomes a draft the rep
// reviews and sends from the chat; otherwise it is copied for the rep's own
// WhatsApp.
export const whatsappQuote = async ({
  quote,
  message,
}: {
  quote: QuoteRecord;
  message: string;
}): Promise<void> => {
  try {
    const client = new CoreApiClient();
    const conversationId = quote.person
      ? await findWhatsappConversationId(client, quote.person.id)
      : undefined;

    if (!quote.person || !conversationId) {
      await copyToClipboard(message);
      await enqueueSnackbar({
        message:
          'There is no WhatsApp chat with this contact in the CRM yet, so the message was copied. Paste it into WhatsApp.',
        variant: 'info',
      });

      return;
    }

    const { conversationMessages } = await client.query({
      conversationMessages: {
        __args: {
          filter: {
            conversationId: { eq: conversationId },
            isDraft: { eq: true },
          },
          first: 1,
        },
        edges: { node: { id: true } },
      },
    });

    const draftId = (
      (conversationMessages?.edges ?? []) as { node: { id: string } }[]
    )[0]?.node.id;

    if (draftId) {
      await client.mutation({
        updateConversationMessage: {
          __args: { id: draftId, data: { body: message } },
          id: true,
        },
      });
    } else {
      await client.mutation({
        createConversationMessage: {
          __args: {
            data: {
              conversationId,
              channelType: 'WHATSAPP',
              direction: 'OUTBOUND',
              isDraft: true,
              body: message,
            },
          },
          id: true,
        },
      });
    }

    await openSidePanelPage({
      page: SidePanelPages.ViewRecord,
      objectNameSingular: 'person',
      recordId: quote.person.id,
      tab: await findPersonConversationsTabId(),
    });
  } catch {
    await enqueueSnackbar({
      message: 'Could not prepare the WhatsApp message.',
      variant: 'error',
    });
  }
};
