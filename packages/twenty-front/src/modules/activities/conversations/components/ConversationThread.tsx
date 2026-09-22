import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { IconChevronLeft } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ConversationComposer } from '@/activities/conversations/components/ConversationComposer';
import { ConversationMessageBubble } from '@/activities/conversations/components/ConversationMessageBubble';
import { type ConversationMessageRecord } from '@/activities/conversations/types/ConversationMessageRecord';
import { SkeletonLoader } from '@/activities/components/SkeletonLoader';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const StyledHeader = styled.button`
  align-items: center;
  all: unset;
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  &:hover {
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledMessageList = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  overflow: auto;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

type ConversationThreadProps = {
  conversationId: string;
  onBack: () => void;
};

export const ConversationThread = ({
  conversationId,
  onBack,
}: ConversationThreadProps) => {
  // No-op: useSendWhatsappMessage already refetches FindManyConversationMessages
  // on success, which updates this component's query result automatically.
  const handleMessageSent = () => {};

  const { records: messages, loading } =
    useFindManyRecords<ConversationMessageRecord>({
      objectNameSingular: 'conversationMessage',
      filter: { conversationId: { eq: conversationId } },
      orderBy: [{ sentAt: 'AscNullsFirst' }, { receivedAt: 'AscNullsFirst' }],
      recordGqlFields: {
        id: true,
        body: true,
        direction: true,
        sentAt: true,
        receivedAt: true,
        deliveryStatus: true,
        conversationId: true,
      },
    });

  return (
    <StyledContainer>
      <StyledHeader onClick={onBack}>
        <IconChevronLeft size={16} />
        {t`Conversations`}
      </StyledHeader>
      <StyledMessageList>
        {loading ? (
          <SkeletonLoader />
        ) : (
          messages.map((message) => (
            <ConversationMessageBubble key={message.id} message={message} />
          ))
        )}
      </StyledMessageList>
      <ConversationComposer
        conversationId={conversationId}
        onMessageSent={handleMessageSent}
      />
    </StyledContainer>
  );
};
