import { type ProspectingJobPayload } from 'src/engine/core-modules/prospecting-job/types/prospecting-job-payload.type';
import { type ProspectingJobOperation } from 'src/engine/core-modules/prospecting-job/types/prospecting-job-operation.type';

export type CreateProspectingJobInput = {
  workspaceId: string;
  campaignId: string;
  candidateId?: string | null;
  operation: ProspectingJobOperation;
  idempotencyKey: string;
  input?: ProspectingJobPayload;
  maxAttempts?: number;
  correlationId?: string | null;
  runAt?: Date;
};
