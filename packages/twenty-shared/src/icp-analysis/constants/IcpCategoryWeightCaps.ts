import { type IcpAttributeCategory } from '@/icp-analysis/types/IcpAttributeCategory';

// Upper bound on the points a category can contribute to the maximum score,
// from the starter split in the ICP guide.
export const ICP_CATEGORY_WEIGHT_CAPS: Record<IcpAttributeCategory, number> = {
  FIRMOGRAPHIC: 35,
  INTENT: 30,
  TECHNOGRAPHIC: 20,
  TRIGGER: 20,
};
