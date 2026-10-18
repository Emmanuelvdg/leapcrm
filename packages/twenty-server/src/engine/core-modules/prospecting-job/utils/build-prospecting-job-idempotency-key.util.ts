import { type ProspectingJobOperation } from 'src/engine/core-modules/prospecting-job/types/prospecting-job-operation.type';

export const buildProspectingJobIdempotencyKey = ({
  campaignId,
  operation,
  target,
  version,
}: {
  campaignId: string;
  operation: ProspectingJobOperation;
  target: string;
  version: number;
}): string => `${campaignId}:${operation}:${target}:${version}`;
