import { useCallback, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { type NextBestActionDetails } from 'src/utils/next-best-action-details.type';

export type NextBestActionContact = {
  id: string;
  firstName: string | null;
  email: string | null;
};

export type NextBestActionRecord = {
  id: string;
  ownerId: string | null;
  currencyCode: string | null;
  nextBestAction: string | null;
  nextBestActionReason: string | null;
  nextBestActionType: string | null;
  nextBestActionChannel: string | null;
  nextBestActionDraft: string | null;
  nextBestActionDueDate: string | null;
  nextBestActionDetails: NextBestActionDetails | null;
  dealRisk: string | null;
  nextBestActionUpdatedAt: string | null;
  contact: NextBestActionContact | null;
  whatsappConversation: { id: string; lastInboundAt: string | null } | null;
};

type OpportunityNode = Omit<
  NextBestActionRecord,
  'contact' | 'whatsappConversation' | 'currencyCode'
> & {
  amount: { currencyCode: string | null } | null;
  pointOfContact: {
    id: string;
    name: { firstName: string | null } | null;
    emails: { primaryEmail: string | null } | null;
  } | null;
};

type NextBestActionState = {
  record: NextBestActionRecord | undefined;
  isLoading: boolean;
  errorMessage: string | undefined;
};

const fetchLatestWhatsappConversation = async (
  client: CoreApiClient,
  contactId: string,
) => {
  const { conversations } = await client.query({
    conversations: {
      __args: {
        filter: { personId: { eq: contactId } },
        orderBy: [{ lastMessageAt: 'DescNullsLast' }],
        first: 5,
      },
      edges: {
        node: { id: true, channelType: true, lastInboundAt: true },
      },
    },
  });

  const conversation = (
    (conversations?.edges ?? []) as {
      node: {
        id: string;
        channelType: string | null;
        lastInboundAt: string | null;
      };
    }[]
  ).find((edge) => edge.node.channelType === 'WHATSAPP')?.node;

  if (!conversation) {
    return null;
  }

  // The conversation's lastInboundAt is only kept up to date by the WhatsApp
  // webhook; the newest incoming message is the source of truth, as for the agent.
  const { conversationMessages } = await client.query({
    conversationMessages: {
      __args: {
        filter: {
          conversationId: { eq: conversation.id },
          direction: { eq: 'INBOUND' },
          isDraft: { eq: false },
        },
        orderBy: [{ createdAt: 'DescNullsLast' }],
        first: 1,
      },
      edges: {
        node: { receivedAt: true, sentAt: true, createdAt: true },
      },
    },
  });

  const latestInboundMessage = (
    (conversationMessages?.edges ?? []) as {
      node: {
        receivedAt: string | null;
        sentAt: string | null;
        createdAt: string;
      };
    }[]
  )[0]?.node;
  const latestInboundMessageAt = latestInboundMessage
    ? (latestInboundMessage.receivedAt ??
      latestInboundMessage.sentAt ??
      latestInboundMessage.createdAt)
    : null;

  const lastInboundAt =
    [conversation.lastInboundAt, latestInboundMessageAt]
      .filter((date): date is string => date !== null)
      .sort()
      .pop() ?? null;

  return { id: conversation.id, lastInboundAt };
};

const fetchNextBestAction = async (
  opportunityId: string,
): Promise<NextBestActionRecord | undefined> => {
  const client = new CoreApiClient();

  const { opportunity } = await client.query({
    opportunity: {
      __args: { filter: { id: { eq: opportunityId } } },
      id: true,
      ownerId: true,
      amount: { currencyCode: true },
      nextBestAction: true,
      nextBestActionReason: true,
      nextBestActionType: true,
      nextBestActionChannel: true,
      nextBestActionDraft: true,
      nextBestActionDueDate: true,
      nextBestActionDetails: true,
      dealRisk: true,
      nextBestActionUpdatedAt: true,
      pointOfContact: {
        id: true,
        name: { firstName: true },
        emails: { primaryEmail: true },
      },
    },
  });

  const node = opportunity as OpportunityNode | null;

  if (!node) {
    return undefined;
  }

  const { amount, pointOfContact, ...fields } = node;

  return {
    ...fields,
    currencyCode: amount?.currencyCode || null,
    contact: pointOfContact
      ? {
          id: pointOfContact.id,
          firstName: pointOfContact.name?.firstName || null,
          email: pointOfContact.emails?.primaryEmail || null,
        }
      : null,
    whatsappConversation: pointOfContact
      ? await fetchLatestWhatsappConversation(client, pointOfContact.id)
      : null,
  };
};

export const useNextBestAction = (opportunityId: string | null) => {
  const [state, setState] = useState<NextBestActionState>({
    record: undefined,
    isLoading: opportunityId !== null,
    errorMessage: undefined,
  });
  const [reloadCount, setReloadCount] = useState(0);

  const reload = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  useEffect(() => {
    if (opportunityId === null) {
      setState({
        record: undefined,
        isLoading: false,
        errorMessage: undefined,
      });

      return;
    }

    let isCancelled = false;

    const load = async () => {
      setState((previousState) => ({ ...previousState, isLoading: true }));

      try {
        const record = await fetchNextBestAction(opportunityId);

        if (!isCancelled) {
          setState({ record, isLoading: false, errorMessage: undefined });
        }
      } catch {
        if (!isCancelled) {
          setState({
            record: undefined,
            isLoading: false,
            errorMessage:
              'Could not load the suggestion. Please try again later.',
          });
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [opportunityId, reloadCount]);

  return { ...state, reload };
};
