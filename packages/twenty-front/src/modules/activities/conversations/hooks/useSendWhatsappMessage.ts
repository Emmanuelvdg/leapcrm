import { useMutation } from '@apollo/client/react';
import { useCallback } from 'react';

import { SEND_WHATSAPP_MESSAGE } from '@/activities/conversations/graphql/mutations/sendWhatsappMessage';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { t } from '@lingui/core/macro';
import {
  type SendWhatsappMessageMutation,
  type SendWhatsappMessageMutationVariables,
} from '~/generated-metadata/graphql';

type SendWhatsappMessageResult = {
  success: boolean;
  conversationId: string | null;
};

type SendWhatsappMessageParams = {
  body: string;
  conversationId?: string;
  personId?: string;
};

export const useSendWhatsappMessage = () => {
  const apolloCoreClient = useApolloCoreClient();

  const [sendWhatsappMessageMutation, { loading }] = useMutation<
    SendWhatsappMessageMutation,
    SendWhatsappMessageMutationVariables
  >(SEND_WHATSAPP_MESSAGE);

  const { enqueueErrorSnackBar } = useSnackBar();

  const sendWhatsappMessage = useCallback(
    async (
      params: SendWhatsappMessageParams,
    ): Promise<SendWhatsappMessageResult> => {
      try {
        const result = await sendWhatsappMessageMutation({
          variables: {
            input: {
              body: params.body,
              conversationId: params.conversationId,
              personId: params.personId,
            },
          },
        });

        if (result.data?.sendWhatsappMessage.success) {
          await apolloCoreClient.refetchQueries({
            include: ['FindManyConversations', 'FindManyConversationMessages'],
          });

          return {
            success: true,
            conversationId:
              result.data.sendWhatsappMessage.conversationId ?? null,
          };
        }

        enqueueErrorSnackBar({
          message:
            result.data?.sendWhatsappMessage.error ??
            t`Failed to send WhatsApp message`,
        });

        return { success: false, conversationId: null };
      } catch {
        enqueueErrorSnackBar({
          message: t`Failed to send WhatsApp message`,
        });

        return { success: false, conversationId: null };
      }
    },
    [sendWhatsappMessageMutation, enqueueErrorSnackBar, apolloCoreClient],
  );

  return { sendWhatsappMessage, loading };
};
