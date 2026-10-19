import { z } from 'zod';

import { PROSPECTING_CAMPAIGN_MAX_DISCOVERY_SOURCES } from 'src/modules/prospecting/constants/prospecting-campaign-max-discovery-sources.constant';
import { PROSPECTING_CAMPAIGN_MAX_TARGET_CANDIDATE_COUNT } from 'src/modules/prospecting/constants/prospecting-campaign-max-target-candidate-count.constant';
import { prospectingIcpSchema } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

// An empty source list means the sources are picked automatically from the
// ICP once providers exist; known provider ids are checked by the registry.
export const startableProspectingCampaignSchema = z.object({
  icp: prospectingIcpSchema,
  discoverySources: z
    .array(z.string().trim().min(1).max(100))
    .max(PROSPECTING_CAMPAIGN_MAX_DISCOVERY_SOURCES)
    .nullable()
    .transform((discoverySources) => [...new Set(discoverySources ?? [])]),
  targetCandidateCount: z
    .number({ error: 'set a target number of candidates' })
    .int()
    .min(1)
    .max(PROSPECTING_CAMPAIGN_MAX_TARGET_CANDIDATE_COUNT),
});

export type StartableProspectingCampaign = z.infer<
  typeof startableProspectingCampaignSchema
>;
