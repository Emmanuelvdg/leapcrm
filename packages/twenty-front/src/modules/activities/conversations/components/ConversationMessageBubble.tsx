import { styled } from '@linaria/react';

import { type ConversationMessageRecord } from '@/activities/conversations/types/ConversationMessageRecord';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { dateLocaleState } from '~/localization/states/dateLocaleState';
import { beautifyPastDateRelativeToNow } from '~/utils/date-utils';

const StyledMessageBubble = styled.div<{ isOutbound: boolean }>`
  align-items: ${({ isOutbound }) => (isOutbound ? 'flex-end' : 'flex-start')};
  display: flex;
  flex-direction: column;
  width: 100%;

  &:hover .message-footer {
    opacity: 1;
  }
`;

const StyledMessageText = styled.div<{ isOutbound: boolean }>`
  background: ${({ isOutbound }) =>
    isOutbound
      ? themeCssVariables.background.tertiary
      : themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  line-height: 1.4em;
  max-width: 80%;
  overflow-wrap: break-word;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  white-space: pre-wrap;
  width: fit-content;
`;

const StyledMessageFooter = styled.div`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.sm};
  margin-top: ${themeCssVariables.spacing[1]};
  opacity: 0;
  transition: opacity calc(${themeCssVariables.animation.duration.normal} * 1s)
    ease-in-out;
`;

type ConversationMessageBubbleProps = {
  message: ConversationMessageRecord;
};

export const ConversationMessageBubble = ({
  message,
}: ConversationMessageBubbleProps) => {
  const { localeCatalog } = useAtomStateValue(dateLocaleState);

  const isOutbound = message.direction === 'OUTBOUND';
  const timestamp = message.sentAt ?? message.receivedAt;

  return (
    <StyledMessageBubble isOutbound={isOutbound}>
      <StyledMessageText isOutbound={isOutbound}>
        {message.body}
      </StyledMessageText>
      <StyledMessageFooter className="message-footer">
        {timestamp &&
          beautifyPastDateRelativeToNow(new Date(timestamp), localeCatalog)}
      </StyledMessageFooter>
    </StyledMessageBubble>
  );
};
