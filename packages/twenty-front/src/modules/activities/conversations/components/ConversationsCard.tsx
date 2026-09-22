import { useState } from 'react';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ActivityList } from '@/activities/components/ActivityList';
import { SkeletonLoader } from '@/activities/components/SkeletonLoader';
import { ConversationComposer } from '@/activities/conversations/components/ConversationComposer';
import { ConversationRow } from '@/activities/conversations/components/ConversationRow';
import { ConversationThread } from '@/activities/conversations/components/ConversationThread';
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

  if (selectedConversationId) {
    return (
      <StyledContainer>
        <ConversationThread
          conversationId={selectedConversationId}
          onBack={() => setSelectedConversationId(null)}
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
