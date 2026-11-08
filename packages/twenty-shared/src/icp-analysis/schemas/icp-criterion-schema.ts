import { z } from 'zod';

import { ICP_ATTRIBUTE_CATEGORIES } from '@/icp-analysis/constants/IcpAttributeCategories';
import { ICP_CRITERION_MAX_WEIGHT } from '@/icp-analysis/constants/IcpCriterionMaxWeight';
import { ICP_CRITERION_MIN_WEIGHT } from '@/icp-analysis/constants/IcpCriterionMinWeight';
import { ICP_MAX_CRITERIA_COUNT } from '@/icp-analysis/constants/IcpMaxCriteriaCount';

export const icpAttributeCategorySchema = z.enum(ICP_ATTRIBUTE_CATEGORIES);

export const icpCriterionMatchSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('IN'),
    values: z.array(z.string().min(1).max(200)).min(1).max(200),
  }),
  // Half-open band: min <= value < max, null meaning unbounded.
  z
    .object({
      type: z.literal('BETWEEN'),
      min: z.number().nullable(),
      max: z.number().nullable(),
    })
    .refine(({ min, max }) => min !== null || max !== null, {
      message: 'set a minimum, a maximum or both',
    })
    .refine(({ min, max }) => min === null || max === null || min < max, {
      message: 'must be greater than the minimum',
      path: ['max'],
    }),
  z.object({
    type: z.literal('IS'),
    value: z.boolean(),
  }),
]);

export const icpCriterionSchema = z
  .object({
    id: z.string().trim().min(1).max(300),
    attributeKey: z.string().trim().min(1).max(200),
    attributeLabel: z.string().trim().min(1).max(200),
    label: z.string().trim().min(1).max(300),
    category: icpAttributeCategorySchema,
    match: icpCriterionMatchSchema,
    weight: z
      .number()
      .int()
      .min(ICP_CRITERION_MIN_WEIGHT)
      .max(ICP_CRITERION_MAX_WEIGHT),
    isHardExclusion: z.boolean().default(false),
  })
  .refine(({ isHardExclusion, weight }) => !isHardExclusion || weight <= 0, {
    message: 'a hard exclusion cannot add points',
    path: ['weight'],
  });

export const icpCriteriaSchema = z
  .array(icpCriterionSchema)
  .max(ICP_MAX_CRITERIA_COUNT)
  .refine(
    (criteria) =>
      new Set(criteria.map(({ id }) => id)).size === criteria.length,
    { message: 'criterion ids must be unique' },
  );
