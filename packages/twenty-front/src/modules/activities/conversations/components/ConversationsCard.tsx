import { useState } from 'react';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ActivityList } from '@/activities/components/ActivityList';
import { SkeletonLoader } from '@/activities/components/SkeletonLoader';
import { ConversationComposer } from '@/activities/conversations/components/ConversationComposer';
import { ConversationRow } from '@/activities/conversations/components/ConversationRow';
import { ConversationThread } from '@/activities/conversations/components/ConversationThread';
import { type ConversationMessageRecord } from '@/activities/conversations/types/ConversationMessageRecord';
import { type ConversationRecord } from '@/activities/conversations/types/ConversationRecord';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const StyledEmptyStateContainer = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex: 1;
  justify-content: center;
  padding: ${themeCssVariables.spacing[6]};
  text-align: center;
`;

export const ConversationsCard = () => {
  const targetRecord = useTargetRecord();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [hasLeftDraftConversation, setHasLeftDraftConversation] =
    useState(false);

  const { records: conversations, loading } =
    useFindManyRecords<ConversationRecord>({
      objectNameSingular: 'conversation',
      filter: { personId: { eq: targetRecord.id } },
      orderBy: [{ lastMessageAt: 'DescNullsLast' }],
      recordGqlFields: {
        id: true,
        subject: true,
        status: true,
        isUnread: true,
        lastMessageAt: true,
        personId: true,
      },
    });

  const conversationIds = conversations.map((conversation) => conversation.id);

  const { records: pendingDrafts } =
    useFindManyRecords<ConversationMessageRecord>({
      objectNameSingular: 'conversationMessage',
      filter: {
        conversationId: { in: conversationIds },
        isDraft: { eq: true },
      },
      orderBy: [{ updatedAt: 'DescNullsLast' }],
      limit: 1,
      skip: conversationIds.length === 0,
      recordGqlFields: { id: true, conversationId: true },
    });

  // A pending draft (for example one prepared by Deal coach) opens its
  // conversation directly, until the user goes back to the list.
  const openConversationId =
    selectedConversationId ??
    (hasLeftDraftConversation
      ? null
      : (pendingDrafts[0]?.conversationId ?? null));

  if (openConversationId) {
    return (
      <StyledContainer>
        <ConversationThread
          conversationId={openConversationId}
          onBack={() => {
            setSelectedConversationId(null);
            setHasLeftDraftConversation(true);
          }}
        />
      </StyledContainer>
    );
  }

  if (loading) {
    return <SkeletonLoader />;
  }

  if (conversations.length === 0) {
    return (
      <StyledContainer>
        <StyledEmptyStateContainer>
          {t`No WhatsApp conversations yet. Send a message to start one.`}
        </StyledEmptyStateContainer>
        <ConversationComposer
          personId={targetRecord.id}
          onMessageSent={(conversationId) =>
            setSelectedConversationId(conversationId)
          }
        />
      </StyledContainer>
    );
  }

  return (
    <StyledContainer>
      <ActivityList>
        {conversations.map((conversation) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            onClick={() => setSelectedConversationId(conversation.id)}
          />
        ))}
      </ActivityList>
    </StyledContainer>
  );
};
