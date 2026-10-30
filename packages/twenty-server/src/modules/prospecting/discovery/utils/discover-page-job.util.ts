import { z } from 'zod';

import { type CreateProspectingJobInput } from 'src/engine/core-modules/prospecting-job/types/create-prospecting-job-input.type';
import { buildProspectingJobIdempotencyKey } from 'src/engine/core-modules/prospecting-job/utils/build-prospecting-job-idempotency-key.util';
import { type DiscoveryStage } from 'src/modules/prospecting/discovery/utils/build-discovery-stages.util';

const discoverPageJobInputSchema = z.object({
  providerId: z.string().min(1),
  countryCode: z.string().nullable(),
  cursor: z.string().nullable(),
  pageIndex: z.number().int().min(0),
  // Absent on jobs planned before profile fingerprints existed.
  profileFingerprint: z.string().min(1).optional(),
});

export type DiscoverPageJobInput = z.infer<typeof discoverPageJobInputSchema>;

export const parseDiscoverPageJobInput = (
  input: unknown,
): DiscoverPageJobInput | null => {
  const parsedInput = discoverPageJobInputSchema.safeParse(input);

  return parsedInput.success ? parsedInput.data : null;
};

// The page index rather than the cursor goes into the key: cursors can be
// long and opaque, while a page index is fixed for a given stage. The profile
// fingerprint starts a fresh set of keys whenever the search changes.
export const buildDiscoverPageJob = ({
  workspaceId,
  campaignId,
  icpVersion,
  stage,
  cursor,
  pageIndex,
  profileFingerprint,
}: {
  workspaceId: string;
  campaignId: string;
  icpVersion: number;
  stage: DiscoveryStage;
  cursor: string | null;
  pageIndex: number;
  profileFingerprint: string;
}): CreateProspectingJobInput => ({
  workspaceId,
  campaignId,
  operation: 'DISCOVER_PAGE',
  idempotencyKey: buildProspectingJobIdempotencyKey({
    campaignId,
    operation: 'DISCOVER_PAGE',
    target: `${stage.providerId}:${stage.countryCode ?? 'ALL'}:${pageIndex}:${profileFingerprint}`,
    version: icpVersion,
  }),
  input: {
    providerId: stage.providerId,
    countryCode: stage.countryCode,
    cursor,
    pageIndex,
    profileFingerprint,
  },
});
