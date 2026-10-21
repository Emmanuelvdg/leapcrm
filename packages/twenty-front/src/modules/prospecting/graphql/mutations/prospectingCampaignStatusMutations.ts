import { gql } from '@apollo/client';

export const START_PROSPECTING_CAMPAIGN = gql`
  mutation StartProspectingCampaign($input: ProspectingCampaignIdInput!) {
    startProspectingCampaign(input: $input) {
      campaignId
      status
    }
  }
`;

export const PAUSE_PROSPECTING_CAMPAIGN = gql`
  mutation PauseProspectingCampaign($input: ProspectingCampaignIdInput!) {
    pauseProspectingCampaign(input: $input) {
      campaignId
      status
    }
  }
`;

export const RESUME_PROSPECTING_CAMPAIGN = gql`
  mutation ResumeProspectingCampaign($input: ProspectingCampaignIdInput!) {
    resumeProspectingCampaign(input: $input) {
      campaignId
      status
    }
  }
`;

export const CANCEL_PROSPECTING_CAMPAIGN = gql`
  mutation CancelProspectingCampaign($input: ProspectingCampaignIdInput!) {
    cancelProspectingCampaign(input: $input) {
      campaignId
      status
    }
  }
`;
