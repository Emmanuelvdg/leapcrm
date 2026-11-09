import {
  icpCriteriaSchema,
  icpTierThresholdsSchema,
} from 'twenty-shared/icp-analysis';
import { isDefined } from 'twenty-shared/utils';
import { z } from 'zod';

import { type IcpModelInput } from 'src/modules/icp-analysis/types/icp-model-input.type';

const stageListSchema = z
  .array(z.string().trim().min(1).max(100))
  .min(1)
  .max(50)
  .refine((stages) => new Set(stages).size === stages.length, {
    message: 'list each stage only once',
  });

const formatSchemaError = (fieldLabel: string, error: z.ZodError): string => {
  const [firstIssue] = error.issues;
  const location =
    firstIssue.path.length > 0 ? ` (${firstIssue.path.join('.')})` : '';

  return `${fieldLabel}${location}: ${firstIssue.message}`;
};

const getSchemaError = (
  fieldLabel: string,
  schema: z.ZodType,
  value: unknown,
): string | null => {
  if (!isDefined(value)) {
    return null;
  }

  const result = schema.safeParse(value);

  return result.success ? null : formatSchemaError(fieldLabel, result.error);
};

const toTime = (value: Date | string | null | undefined): number | null => {
  if (!isDefined(value)) {
    return null;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? null : time;
};

export const getIcpModelInputError = (input: IcpModelInput): string | null => {
  if (input.status === 'ACTIVE') {
    return 'Use the Activate action to make a model active';
  }

  const schemaError =
    getSchemaError('Criteria', icpCriteriaSchema, input.criteria) ??
    getSchemaError(
      'Tier thresholds',
      icpTierThresholdsSchema,
      input.tierThresholds,
    ) ??
    getSchemaError('Won stages', stageListSchema, input.wonStages) ??
    getSchemaError('Lost stages', stageListSchema, input.lostStages);

  if (isDefined(schemaError)) {
    return schemaError;
  }

  if (Array.isArray(input.wonStages) && Array.isArray(input.lostStages)) {
    const sharedStage = input.wonStages.find((stage) =>
      input.lostStages?.includes(stage),
    );

    if (isDefined(sharedStage)) {
      return `Stage ${sharedStage} cannot count as both won and lost`;
    }
  }

  const datasetStartTime = toTime(input.datasetStartDate);
  const datasetEndTime = toTime(input.datasetEndDate);

  if (
    isDefined(datasetStartTime) &&
    isDefined(datasetEndTime) &&
    datasetStartTime >= datasetEndTime
  ) {
    return 'The deal window must start before it ends';
  }

  return null;
};
