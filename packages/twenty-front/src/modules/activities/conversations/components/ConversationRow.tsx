import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ActivityRow } from '@/activities/components/ActivityRow';
import { type ConversationRecord } from '@/activities/conversations/types/ConversationRecord';
import { formatToHumanReadableDate } from '~/utils/date-utils';

const StyledSubject = styled.span<{ unread: boolean }>`
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-weight: ${({ unread }) => (unread ? 600 : 400)};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledReceivedAt = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[0]} ${themeCssVariables.spacing[1]};
`;

type ConversationRowProps = {
  conversation: ConversationRecord;
  onClick: () => void;
};

export const ConversationRow = ({
  conversation,
  onClick,
}: ConversationRowProps) => {
  return (
    <ActivityRow onClick={onClick}>
      <StyledSubject unread={conversation.isUnread}>
        {conversation.subject ?? t`WhatsApp conversation`}
      </StyledSubject>
      {conversation.lastMessageAt && (
        <StyledReceivedAt>
          {formatToHumanReadableDate(conversation.lastMessageAt)}
        </StyledReceivedAt>
      )}
    </ActivityRow>
  );
};
