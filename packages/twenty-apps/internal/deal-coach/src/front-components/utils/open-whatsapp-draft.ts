import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import {
  enqueueSnackbar,
  openSidePanelPage,
  SidePanelPages,
} from 'twenty-sdk/front-component';

import { type NextBestActionRecord } from 'src/front-components/hooks/use-next-best-action';

const CONVERSATIONS_WIDGET_TYPE = 'CONVERSATIONS';

// The draft is stored as a draft message in the conversation, which the
// WhatsApp composer loads as its starting text; nothing is sent from here.
const saveWhatsappDraft = async (
  conversationId: string,
  body: string,
): Promise<void> => {
  const client = new CoreApiClient();

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

  const existingDraftId = (
    (conversationMessages?.edges ?? []) as { node: { id: string } }[]
  )[0]?.node.id;

  if (existingDraftId) {
    await client.mutation({
      updateConversationMessage: {
        __args: { id: existingDraftId, data: { body } },
        id: true,
      },
    });

    return;
  }

  await client.mutation({
    createConversationMessage: {
      __args: {
        data: {
          conversationId,
          channelType: 'WHATSAPP',
          direction: 'OUTBOUND',
          isDraft: true,
          body,
        },
      },
      id: true,
    },
  });
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

export const openWhatsappDraft = async (
  record: NextBestActionRecord,
): Promise<boolean> => {
  if (!record.contact || !record.whatsappConversation) {
    await enqueueSnackbar({
      message: 'There is no WhatsApp conversation with this contact yet.',
      variant: 'info',
    });

    return false;
  }

  try {
    await saveWhatsappDraft(
      record.whatsappConversation.id,
      record.nextBestActionDraft ?? '',
    );

    await openSidePanelPage({
      page: SidePanelPages.ViewRecord,
      objectNameSingular: 'person',
      recordId: record.contact.id,
      tab: await findPersonConversationsTabId(),
    });

    return true;
  } catch {
    await enqueueSnackbar({
      message: 'Could not prepare the WhatsApp draft.',
      variant: 'error',
    });

    return false;
  }
};
