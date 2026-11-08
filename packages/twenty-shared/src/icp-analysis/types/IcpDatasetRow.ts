import { type IcpAttributeValues } from '@/icp-analysis/types/IcpAttributeValue';
import { type IcpOutcome } from '@/icp-analysis/types/IcpOutcome';

export type IcpDatasetRow = {
  id: string;
  outcome: IcpOutcome;
  closedAt: string;
  values: IcpAttributeValues;
  lostReason?: string | null;
};
