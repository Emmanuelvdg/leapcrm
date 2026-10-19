import { PROSPECTING_CAMPAIGN_STATUS_TRANSITIONS } from 'src/modules/prospecting/constants/prospecting-campaign-status-transitions.constant';
import { type ProspectingCampaignStatus } from 'src/modules/prospecting/types/prospecting-campaign-status.type';

export const isProspectingCampaignStatusTransitionAllowed = ({
  fromStatus,
  toStatus,
}: {
  fromStatus: ProspectingCampaignStatus;
  toStatus: ProspectingCampaignStatus;
}): boolean =>
  PROSPECTING_CAMPAIGN_STATUS_TRANSITIONS[fromStatus].includes(toStatus);
