import { type icpTierThresholdsSchema } from '@/icp-analysis/schemas/icp-tier-thresholds-schema';
import type z from 'zod';

export type IcpTierThresholds = z.infer<typeof icpTierThresholdsSchema>;
