import { styled } from '@linaria/react';

import { type ConversationMessageRecord } from '@/activities/conversations/types/ConversationMessageRecord';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { Trans } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledEventCardMessageContainer = styled.div`
  cursor: pointer;
  display: flex;
  flex-direction: column;
  max-width: 380px;
  width: 100%;
`;

const StyledWhatsappContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: center;
`;

const StyledWhatsappDirection = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledWhatsappBody = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const EventCardConversationMessage = ({
  conversationMessageId,
}: {
  conversationMessageId: string;
}) => {
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();

  const {
    record: conversationMessage,
    loading,
    error,
  } = useFindOneRecord<ConversationMessageRecord>({
    objectNameSingular: 'conversationMessage',
    objectRecordId: conversationMessageId,
    recordGqlFields: {
      id: true,
      body: true,
      direction: true,
      conversationId: true,
    },
  });

  if (isDefined(error)) {
    return (
      <div>
        <Trans>Error loading message</Trans>
      </div>
    );
  }

  if (loading || !isDefined(conversationMessage)) {
    return (
      <div>
        <Trans>Loading...</Trans>
      </div>
    );
  }

  const handleClick = () => {
    openRecordInSidePanel({
      recordId: conversationMessage.conversationId,
      objectNameSingular: 'conversation',
    });
  };

  return (
    <StyledEventCardMessageContainer onClick={handleClick}>
      <StyledWhatsappContent>
        <StyledWhatsappDirection>
          {conversationMessage.direction === 'OUTBOUND' ? (
            <Trans>WhatsApp message sent</Trans>
          ) : (
            <Trans>WhatsApp message received</Trans>
          )}
        </StyledWhatsappDirection>
        <StyledWhatsappBody>{conversationMessage.body}</StyledWhatsappBody>
      </StyledWhatsappContent>
    </StyledEventCardMessageContainer>
  );
};
