import { msg } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

import { ApiConnectionExceptionCode } from 'src/engine/core-modules/api-connection/api-connection-exception-code.enum';
import { ApiConnectionException } from 'src/engine/core-modules/api-connection/api-connection.exception';
import { ApiConnectionAuthType } from 'src/engine/core-modules/api-connection/enums/api-connection-auth-type.enum';
import { apiConnectionOperationsSchema } from 'src/engine/core-modules/api-connection/schemas/api-connection-operation.schema';
import { type ApiConnectionOperation } from 'src/engine/core-modules/api-connection/types/api-connection-operation.type';
import {
  isSameHttpHeaderName,
  isValidHttpHeaderName,
  isValidHttpHeaderValue,
} from 'src/engine/core-modules/api-connection/utils/http-header-name.util';
import {
  API_OPERATION_NESTED_BODY_ARGUMENT_NAME,
  resolveApiOperationBodyMode,
} from 'src/engine/core-modules/api-connection/utils/resolve-api-operation-body-mode.util';

export const MAX_ENABLED_API_CONNECTION_OPERATIONS = 50;

const PATH_PLACEHOLDER_PATTERN = /\{([^{}]+)\}/g;

export type ApiConnectionConfiguration = {
  baseUrl: string;
  authType: ApiConnectionAuthType;
  authHeaderName: string | null;
  defaultHeaders: Record<string, string>;
  operations: unknown;
  testOperationName: string | null;
};

const invalid = (message: string) =>
  new ApiConnectionException(
    message,
    ApiConnectionExceptionCode.INVALID_CONFIGURATION,
    { userFriendlyMessage: msg`Invalid API connection: ${message}` },
  );

const validateBaseUrl = (baseUrl: string): void => {
  let url: URL;

  try {
    url = new URL(baseUrl);
  } catch {
    throw invalid(`Base URL "${baseUrl}" is not a valid URL`);
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw invalid('Base URL must use http or https');
  }

  if (url.username !== '' || url.password !== '') {
    throw invalid(
      'Base URL cannot contain credentials; use the API key field instead',
    );
  }

  if (url.hash !== '') {
    throw invalid('Base URL cannot contain a fragment');
  }
};

const getProtectedHeaderNames = (
  configuration: ApiConnectionConfiguration,
): string[] =>
  configuration.authType === ApiConnectionAuthType.API_KEY_HEADER &&
  isDefined(configuration.authHeaderName)
    ? ['Authorization', configuration.authHeaderName]
    : ['Authorization'];

const validateHeaders = (configuration: ApiConnectionConfiguration): void => {
  if (configuration.authType === ApiConnectionAuthType.API_KEY_HEADER) {
    if (
      !isDefined(configuration.authHeaderName) ||
      !isValidHttpHeaderName(configuration.authHeaderName)
    ) {
      throw invalid('API key header connections need a valid header name');
    }
  }

  const protectedHeaderNames = getProtectedHeaderNames(configuration);

  for (const [name, value] of Object.entries(configuration.defaultHeaders)) {
    if (!isValidHttpHeaderName(name)) {
      throw invalid(`Default header "${name}" is not a valid header name`);
    }

    if (typeof value !== 'string' || !isValidHttpHeaderValue(value)) {
      throw invalid(`Default header "${name}" has an invalid value`);
    }

    if (
      protectedHeaderNames.some((protectedName) =>
        isSameHttpHeaderName(protectedName, name),
      )
    ) {
      throw invalid(
        `Default header "${name}" would carry the API key; put the key in the API key field instead`,
      );
    }
  }
};

const validateOperation = (
  operation: ApiConnectionOperation,
  protectedHeaderNames: string[],
): void => {
  const parameterNames = new Set<string>();

  for (const parameter of operation.parameters) {
    if (parameterNames.has(parameter.name)) {
      throw invalid(
        `Operation "${operation.name}" declares parameter "${parameter.name}" twice`,
      );
    }

    parameterNames.add(parameter.name);

    if (parameter.in === 'header') {
      if (!isValidHttpHeaderName(parameter.name)) {
        throw invalid(
          `Operation "${operation.name}" has an invalid header parameter "${parameter.name}"`,
        );
      }

      if (
        protectedHeaderNames.some((protectedName) =>
          isSameHttpHeaderName(protectedName, parameter.name),
        )
      ) {
        throw invalid(
          `Operation "${operation.name}" cannot take the auth header "${parameter.name}" as a parameter`,
        );
      }
    }
  }

  const placeholders = [
    ...operation.path.matchAll(PATH_PLACEHOLDER_PATTERN),
  ].map((match) => match[1]);
  const pathParameterNames = operation.parameters
    .filter((parameter) => parameter.in === 'path')
    .map((parameter) => parameter.name);

  for (const placeholder of placeholders) {
    if (!pathParameterNames.includes(placeholder)) {
      throw invalid(
        `Operation "${operation.name}" uses "{${placeholder}}" in its path without a path parameter`,
      );
    }
  }

  for (const pathParameterName of pathParameterNames) {
    if (!placeholders.includes(pathParameterName)) {
      throw invalid(
        `Operation "${operation.name}" declares path parameter "${pathParameterName}" that is not in its path`,
      );
    }
  }

  if (
    resolveApiOperationBodyMode(operation) === 'nested' &&
    parameterNames.has(API_OPERATION_NESTED_BODY_ARGUMENT_NAME)
  ) {
    throw invalid(
      `Operation "${operation.name}" cannot have a parameter named "${API_OPERATION_NESTED_BODY_ARGUMENT_NAME}"`,
    );
  }
};

export const validateApiConnectionConfiguration = (
  configuration: ApiConnectionConfiguration,
): ApiConnectionOperation[] => {
  validateBaseUrl(configuration.baseUrl);
  validateHeaders(configuration);

  const parsed = apiConnectionOperationsSchema.safeParse(
    configuration.operations,
  );

  if (!parsed.success) {
    const issue = parsed.error.issues[0];

    throw invalid(
      `Invalid operation at ${issue.path.join('.')}: ${issue.message}`,
    );
  }

  const operations = parsed.data;
  const operationNames = new Set<string>();
  const protectedHeaderNames = getProtectedHeaderNames(configuration);

  for (const operation of operations) {
    if (operationNames.has(operation.name)) {
      throw invalid(`Operation name "${operation.name}" is used twice`);
    }

    operationNames.add(operation.name);
    validateOperation(operation, protectedHeaderNames);
  }

  const enabledCount = operations.filter(
    (operation) => operation.isEnabled,
  ).length;

  if (enabledCount > MAX_ENABLED_API_CONNECTION_OPERATIONS) {
    throw invalid(
      `At most ${MAX_ENABLED_API_CONNECTION_OPERATIONS} operations can be enabled per connection`,
    );
  }

  if (
    isDefined(configuration.testOperationName) &&
    !operationNames.has(configuration.testOperationName)
  ) {
    throw invalid(
      `Test operation "${configuration.testOperationName}" does not exist`,
    );
  }

  return operations;
};
