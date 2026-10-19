import { type ProspectingCampaignStatus } from 'src/modules/prospecting/types/prospecting-campaign-status.type';
import { isProspectingCampaignStatusTransitionAllowed } from 'src/modules/prospecting/utils/is-prospecting-campaign-status-transition-allowed.util';

describe('isProspectingCampaignStatusTransitionAllowed', () => {
  it.each<[ProspectingCampaignStatus, ProspectingCampaignStatus]>([
    ['DRAFT', 'RUNNING'],
    ['DRAFT', 'CANCELLED'],
    ['RUNNING', 'PAUSED'],
    ['RUNNING', 'COMPLETED'],
    ['RUNNING', 'FAILED'],
    ['RUNNING', 'CANCELLED'],
    ['PAUSED', 'RUNNING'],
    ['PAUSED', 'CANCELLED'],
  ])('allows %s to %s', (fromStatus, toStatus) => {
    expect(
      isProspectingCampaignStatusTransitionAllowed({ fromStatus, toStatus }),
    ).toBe(true);
  });

  it.each<[ProspectingCampaignStatus, ProspectingCampaignStatus]>([
    ['DRAFT', 'PAUSED'],
    ['DRAFT', 'COMPLETED'],
    ['PAUSED', 'COMPLETED'],
    ['COMPLETED', 'RUNNING'],
    ['CANCELLED', 'RUNNING'],
    ['CANCELLED', 'DRAFT'],
    ['FAILED', 'RUNNING'],
    ['RUNNING', 'RUNNING'],
  ])('rejects %s to %s', (fromStatus, toStatus) => {
    expect(
      isProspectingCampaignStatusTransitionAllowed({ fromStatus, toStatus }),
    ).toBe(false);
  });
});
