import { createHash } from 'crypto';

import { type ProspectingIcp } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

// Identifies what a discovery job searches for. Jobs carry it so a profile,
// source or target edit made after they were planned is noticed: their
// cursors belong to the old search and must not be applied to the new one.
export const buildDiscoveryProfileFingerprint = ({
  icp,
  discoverySources,
  targetCandidateCount,
}: {
  icp: ProspectingIcp;
  discoverySources: string[];
  targetCandidateCount: number;
}): string =>
  createHash('sha256')
    .update(JSON.stringify({ icp, discoverySources, targetCandidateCount }))
    .digest('hex')
    .slice(0, 16);
