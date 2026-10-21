import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';

import { HeadlessConfirmationModalEngineCommandEffect } from '@/command-menu-item/engine-command/components/HeadlessConfirmationModalEngineCommandEffect';
import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import {
  type ProspectingCampaignAction,
  useProspectingCampaignAction,
} from '@/prospecting/hooks/useProspectingCampaignAction';

type ProspectingCampaignStatusSingleRecordCommandProps = {
  action: ProspectingCampaignAction;
};

export const ProspectingCampaignStatusSingleRecordCommand = ({
  action,
}: ProspectingCampaignStatusSingleRecordCommandProps) => {
  const { t } = useLingui();
  const { selectedRecords } = useHeadlessCommandContextApi();
  const { runProspectingCampaignAction } = useProspectingCampaignAction();

  const campaignId = selectedRecords[0]?.id;

  if (!isDefined(campaignId)) {
    throw new Error('Record ID is required to change the campaign status');
  }

  const handleExecute = () =>
    runProspectingCampaignAction({ campaignId, action });

  // Cancelling cannot be undone: the campaign ends and its queued discovery
  // stops.
  if (action === 'cancel') {
    return (
      <HeadlessConfirmationModalEngineCommandEffect
        title={t`Cancel campaign`}
        subtitle={t`Discovery stops and the campaign cannot be restarted. Candidates found so far are kept.`}
        confirmButtonText={t`Cancel campaign`}
        confirmButtonAccent="danger"
        execute={handleExecute}
      />
    );
  }

  return <HeadlessEngineCommandWrapperEffect execute={handleExecute} ready />;
};
