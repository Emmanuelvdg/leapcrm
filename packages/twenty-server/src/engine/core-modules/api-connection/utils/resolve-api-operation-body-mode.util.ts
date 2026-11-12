import { isDefined } from 'twenty-shared/utils';

import { type ApiConnectionOperation } from 'src/engine/core-modules/api-connection/types/api-connection-operation.type';

export const API_OPERATION_NESTED_BODY_ARGUMENT_NAME = 'body';

export type ApiOperationBodyMode = 'none' | 'flattened' | 'nested';

export const getObjectSchemaProperties = (
  schema: Record<string, unknown> | null,
): Record<string, unknown> | null => {
  if (!isDefined(schema)) {
    return null;
  }

  const isObjectSchema =
    schema.type === 'object' ||
    (!isDefined(schema.type) && isDefined(schema.properties));

  if (!isObjectSchema) {
    return null;
  }

  const properties = schema.properties;

  if (!isDefined(properties)) {
    return {};
  }

  return typeof properties === 'object'
    ? (properties as Record<string, unknown>)
    : null;
};

// Flattening body properties next to the parameters reads better for the AI
// and gives workflow steps one input per field; it is only safe when the
// body is an object and no property shadows a parameter.
export const resolveApiOperationBodyMode = (
  operation: Pick<ApiConnectionOperation, 'parameters' | 'requestBodySchema'>,
): ApiOperationBodyMode => {
  if (!isDefined(operation.requestBodySchema)) {
    return 'none';
  }

  const bodyProperties = getObjectSchemaProperties(operation.requestBodySchema);

  if (!isDefined(bodyProperties)) {
    return 'nested';
  }

  const parameterNames = new Set(
    operation.parameters.map((parameter) => parameter.name),
  );

  const hasCollision = Object.keys(bodyProperties).some((propertyName) =>
    parameterNames.has(propertyName),
  );

  return hasCollision ? 'nested' : 'flattened';
};
