import { styled } from '@linaria/react';

import { ConversationsCard } from '@/activities/conversations/components/ConversationsCard';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';

const StyledContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
`;

type ConversationsWidgetProps = {
  widget: PageLayoutWidget;
};

export const ConversationsWidget = ({
  widget: _widget,
}: ConversationsWidgetProps) => {
  return (
    <StyledContainer>
      <ConversationsCard />
    </StyledContainer>
  );
};
