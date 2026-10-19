import { PROSPECTING_CAMPAIGN_MAX_TARGET_CANDIDATE_COUNT } from 'src/modules/prospecting/constants/prospecting-campaign-max-target-candidate-count.constant';
import { startableProspectingCampaignSchema } from 'src/modules/prospecting/zod-schemas/startable-prospecting-campaign.zod-schema';

const VALID_CAMPAIGN = {
  icp: { targetGeographies: [{ countryCode: 'SG' }] },
  discoverySources: null,
  targetCandidateCount: 100,
};

describe('startableProspectingCampaignSchema', () => {
  it('accepts a campaign with an ICP and a target count', () => {
    const result = startableProspectingCampaignSchema.safeParse(VALID_CAMPAIGN);

    expect(result.success).toBe(true);
    expect(result.data?.discoverySources).toEqual([]);
  });

  it('removes duplicate discovery sources', () => {
    const result = startableProspectingCampaignSchema.safeParse({
      ...VALID_CAMPAIGN,
      discoverySources: ['gleif', 'gleif', 'wikidata'],
    });

    expect(result.data?.discoverySources).toEqual(['gleif', 'wikidata']);
  });

  it('requires a target number of candidates', () => {
    const result = startableProspectingCampaignSchema.safeParse({
      ...VALID_CAMPAIGN,
      targetCandidateCount: null,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'set a target number of candidates',
    );
  });

  it('caps the target number of candidates', () => {
    const result = startableProspectingCampaignSchema.safeParse({
      ...VALID_CAMPAIGN,
      targetCandidateCount: PROSPECTING_CAMPAIGN_MAX_TARGET_CANDIDATE_COUNT + 1,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a campaign without an ICP', () => {
    const result = startableProspectingCampaignSchema.safeParse({
      ...VALID_CAMPAIGN,
      icp: null,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['icp']);
  });
});
