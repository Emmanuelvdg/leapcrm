import {
  type icpCriterionMatchSchema,
  type icpCriterionSchema,
} from '@/icp-analysis/schemas/icp-criterion-schema';
import type z from 'zod';

export type IcpCriterionMatch = z.infer<typeof icpCriterionMatchSchema>;

export type IcpCriterion = z.infer<typeof icpCriterionSchema>;
