import { isDefined } from 'twenty-shared/utils';

import { type ApiConnectionOperation } from 'src/engine/core-modules/api-connection/types/api-connection-operation.type';
import {
  API_OPERATION_NESTED_BODY_ARGUMENT_NAME,
  getObjectSchemaProperties,
  resolveApiOperationBodyMode,
} from 'src/engine/core-modules/api-connection/utils/resolve-api-operation-body-mode.util';

const DEFAULT_PARAMETER_SCHEMA = { type: 'string' };

export const buildApiOperationInputSchema = (
  operation: Pick<ApiConnectionOperation, 'parameters' | 'requestBodySchema'>,
): Record<string, unknown> => {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const parameter of operation.parameters) {
    properties[parameter.name] = {
      ...(parameter.schema ?? DEFAULT_PARAMETER_SCHEMA),
      ...(isDefined(parameter.description) && {
        description: parameter.description,
      }),
    };

    if (parameter.required) {
      required.push(parameter.name);
    }
  }

  const bodyMode = resolveApiOperationBodyMode(operation);
  let additionalProperties = false;

  if (bodyMode === 'flattened' && isDefined(operation.requestBodySchema)) {
    const bodyProperties =
      getObjectSchemaProperties(operation.requestBodySchema) ?? {};
    const bodyRequired = operation.requestBodySchema.required;

    Object.assign(properties, bodyProperties);

    if (Array.isArray(bodyRequired)) {
      required.push(
        ...bodyRequired.filter(
          (name): name is string => typeof name === 'string',
        ),
      );
    }

    additionalProperties =
      operation.requestBodySchema.additionalProperties !== false;
  }

  if (bodyMode === 'nested' && isDefined(operation.requestBodySchema)) {
    properties[API_OPERATION_NESTED_BODY_ARGUMENT_NAME] =
      operation.requestBodySchema;
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 && { required }),
    additionalProperties,
  };
};
