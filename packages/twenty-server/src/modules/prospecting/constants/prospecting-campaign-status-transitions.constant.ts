import { type ProspectingCampaignStatus } from 'src/modules/prospecting/types/prospecting-campaign-status.type';

export const PROSPECTING_CAMPAIGN_STATUS_TRANSITIONS: Record<
  ProspectingCampaignStatus,
  readonly ProspectingCampaignStatus[]
> = {
  DRAFT: ['RUNNING', 'CANCELLED'],
  RUNNING: ['PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'],
  PAUSED: ['RUNNING', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: [],
};
