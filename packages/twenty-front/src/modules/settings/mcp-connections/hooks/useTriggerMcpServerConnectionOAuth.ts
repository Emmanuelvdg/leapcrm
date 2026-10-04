import { useMutation } from '@apollo/client/react';
import { useCallback } from 'react';

import { useRedirect } from '@/domain-manager/hooks/useRedirect';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { REACT_APP_SERVER_BASE_URL } from '~/config';
import { GenerateTransientTokenDocument } from '~/generated-metadata/graphql';

// Mints a transient token then redirects to the MCP connection OAuth
// authorize endpoint. Mirrors useTriggerAppOAuth, adapted for the
// connection-id-only (no providerName/visibility) shape of MCP connections.
export const useTriggerMcpServerConnectionOAuth = () => {
  const [generateTransientToken] = useMutation(GenerateTransientTokenDocument);
  const { redirect } = useRedirect();
  const { enqueueErrorSnackBar } = useSnackBar();

  const triggerMcpServerConnectionOAuth = useCallback(
    async ({ connectionId }: { connectionId: string }) => {
      try {
        const transient = await generateTransientToken();
        const token =
          transient.data?.generateTransientToken?.transientToken?.token;

        if (!isDefined(token)) {
          enqueueErrorSnackBar({
            message: t`Could not start the connection: no authorization token was issued.`,
          });
          return;
        }

        const params = new URLSearchParams({
          connectionId,
          transientToken: token,
        });

        redirect(
          `${REACT_APP_SERVER_BASE_URL}/auth/mcp-connections/authorize?${params.toString()}`,
        );
      } catch (error) {
        enqueueErrorSnackBar({
          message:
            error instanceof Error
              ? error.message
              : t`Could not start the connection.`,
        });
      }
    },
    [generateTransientToken, redirect, enqueueErrorSnackBar],
  );

  return { triggerMcpServerConnectionOAuth };
};
