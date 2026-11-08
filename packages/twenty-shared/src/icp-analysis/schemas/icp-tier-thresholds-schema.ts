import { z } from 'zod';

const icpTierThresholdSchema = z.number().int().min(0).max(100);

export const icpTierThresholdsSchema = z
  .object({
    priority: icpTierThresholdSchema,
    target: icpTierThresholdSchema,
    nurture: icpTierThresholdSchema,
  })
  .refine(
    ({ priority, target, nurture }) => priority > target && target > nurture,
    { message: 'thresholds must decrease from priority to target to nurture' },
  );
