import { useState } from 'react';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useSendWhatsappMessage } from '@/activities/conversations/hooks/useSendWhatsappMessage';

const StyledComposerContainer = styled.div`
  align-items: flex-end;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledTextArea = styled.textarea`
  background: transparent;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.md};
  max-height: 120px;
  min-height: 36px;
  padding: ${themeCssVariables.spacing[2]};
  resize: none;

  &:focus {
    border-color: ${themeCssVariables.border.color.strong};
    outline: none;
  }
`;

type ConversationComposerProps = {
  conversationId?: string;
  personId?: string;
  onMessageSent: (conversationId: string) => void;
};

export const ConversationComposer = ({
  conversationId,
  personId,
  onMessageSent,
}: ConversationComposerProps) => {
  const [body, setBody] = useState('');
  const { sendWhatsappMessage, loading } = useSendWhatsappMessage();

  const canSend = body.trim().length > 0 && !loading;

  const handleSend = async () => {
    if (!canSend) {
      return;
    }

    const result = await sendWhatsappMessage({
      body: body.trim(),
      conversationId,
      personId,
    });

    if (result.success) {
      setBody('');

      if (result.conversationId) {
        onMessageSent(result.conversationId);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <StyledComposerContainer>
      <StyledTextArea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t`Write a WhatsApp message…`}
      />
      <Button
        title={t`Send`}
        onClick={handleSend}
        disabled={!canSend}
        accent="blue"
      />
    </StyledComposerContainer>
  );
};
