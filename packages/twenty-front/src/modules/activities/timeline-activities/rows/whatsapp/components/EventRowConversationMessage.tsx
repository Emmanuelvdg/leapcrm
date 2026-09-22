import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useState } from 'react';

import { EventCard } from '@/activities/timeline-activities/rows/components/EventCard';
import { EventCardToggleButton } from '@/activities/timeline-activities/rows/components/EventCardToggleButton';
import { type EventRowDynamicComponentProps } from '@/activities/timeline-activities/rows/components/EventRowDynamicComponent.types';
import { EventRowItem } from '@/activities/timeline-activities/rows/components/EventRowItem';
import { EventCardConversationMessage } from '@/activities/timeline-activities/rows/whatsapp/components/EventCardConversationMessage';
import { isTimelineActivityWithLinkedRecord } from '@/activities/timeline-activities/types/TimelineActivity';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type EventRowConversationMessageProps = EventRowDynamicComponentProps;

const StyledEventRowConversationMessageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledRowContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${themeCssVariables.spacing[1]};
`;

export const EventRowConversationMessage = ({
  event,
  authorFullName,
  labelIdentifierValue,
}: EventRowConversationMessageProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <StyledEventRowConversationMessageContainer>
      <StyledRowContainer>
        <EventRowItem>{authorFullName}</EventRowItem>
        <EventRowItem variant="action">{t`linked a WhatsApp message with`}</EventRowItem>
        <EventRowItem>{labelIdentifierValue}</EventRowItem>
        <EventCardToggleButton isOpen={isOpen} setIsOpen={setIsOpen} />
      </StyledRowContainer>
      <EventCard isOpen={isOpen}>
        {isTimelineActivityWithLinkedRecord(event) && (
          <EventCardConversationMessage
            conversationMessageId={event.linkedRecordId}
          />
        )}
      </EventCard>
    </StyledEventRowConversationMessageContainer>
  );
};
