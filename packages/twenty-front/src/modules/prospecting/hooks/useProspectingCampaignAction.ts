import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useApolloClient } from '@apollo/client/react';
import { t } from '@lingui/core/macro';
import { type DocumentNode } from 'graphql';

import {
  CANCEL_PROSPECTING_CAMPAIGN,
  PAUSE_PROSPECTING_CAMPAIGN,
  RESUME_PROSPECTING_CAMPAIGN,
  START_PROSPECTING_CAMPAIGN,
} from '@/prospecting/graphql/mutations/prospectingCampaignStatusMutations';
import { useUpsertRecordsInStore } from '@/object-record/record-store/hooks/useUpsertRecordsInStore';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { type ProspectingCampaignStatusDto } from '~/generated-metadata/graphql';

export type ProspectingCampaignAction = 'start' | 'pause' | 'resume' | 'cancel';

const MUTATION_BY_ACTION: Record<
  ProspectingCampaignAction,
  { document: DocumentNode; resultField: string }
> = {
  start: {
    document: START_PROSPECTING_CAMPAIGN,
    resultField: 'startProspectingCampaign',
  },
  pause: {
    document: PAUSE_PROSPECTING_CAMPAIGN,
    resultField: 'pauseProspectingCampaign',
  },
  resume: {
    document: RESUME_PROSPECTING_CAMPAIGN,
    resultField: 'resumeProspectingCampaign',
  },
  cancel: {
    document: CANCEL_PROSPECTING_CAMPAIGN,
    resultField: 'cancelProspectingCampaign',
  },
};

const getSuccessMessage = (action: ProspectingCampaignAction) => {
  switch (action) {
    case 'start':
      return t`Campaign started. Discovery runs in the background.`;
    case 'pause':
      return t`Campaign paused`;
    case 'resume':
      return t`Campaign resumed`;
    case 'cancel':
      return t`Campaign cancelled`;
  }
};

// Uses the client directly rather than a mutation hook: engine commands
// unmount as soon as they have run.
export const useProspectingCampaignAction = () => {
  const apolloClient = useApolloClient();
  const { upsertRecordsInStore } = useUpsertRecordsInStore();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const runProspectingCampaignAction = async ({
    campaignId,
    action,
  }: {
    campaignId: string;
    action: ProspectingCampaignAction;
  }): Promise<void> => {
    const { document, resultField } = MUTATION_BY_ACTION[action];

    try {
      const { data } = await apolloClient.mutate<
        Record<string, ProspectingCampaignStatusDto>
      >({
        mutation: document,
        variables: { input: { campaignId } },
      });

      const statusChange = data?.[resultField];

      if (statusChange) {
        upsertRecordsInStore({
          partialRecords: [
            {
              __typename: 'ProspectingCampaign',
              id: campaignId,
              status: statusChange.status,
            },
          ],
        });
      }

      enqueueSuccessSnackBar({ message: getSuccessMessage(action) });
    } catch (error) {
      enqueueErrorSnackBar({
        ...(CombinedGraphQLErrors.is(error) ? { apolloError: error } : {}),
      });
    }
  };

  return { runProspectingCampaignAction };
};
