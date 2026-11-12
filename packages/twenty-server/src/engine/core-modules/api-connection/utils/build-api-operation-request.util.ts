import { isDefined } from 'twenty-shared/utils';

import { ApiConnectionExceptionCode } from 'src/engine/core-modules/api-connection/api-connection-exception-code.enum';
import { ApiConnectionException } from 'src/engine/core-modules/api-connection/api-connection.exception';
import { ApiConnectionAuthType } from 'src/engine/core-modules/api-connection/enums/api-connection-auth-type.enum';
import {
  type ApiConnectionOperation,
  type ApiConnectionOperationParameter,
} from 'src/engine/core-modules/api-connection/types/api-connection-operation.type';
import {
  isSameHttpHeaderName,
  isValidHttpHeaderValue,
} from 'src/engine/core-modules/api-connection/utils/http-header-name.util';
import {
  API_OPERATION_NESTED_BODY_ARGUMENT_NAME,
  resolveApiOperationBodyMode,
} from 'src/engine/core-modules/api-connection/utils/resolve-api-operation-body-mode.util';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

const PATH_PLACEHOLDER_PATTERN = /\{([^{}]+)\}/g;

export type ApiOperationRequestConfig = {
  baseUrl: string;
  authType: ApiConnectionAuthType;
  authHeaderName: string | null;
  secret: string | null;
  defaultHeaders: Record<string, string>;
};

export type ApiOperationRequest = {
  method: ApiConnectionOperation['method'];
  url: string;
  headers: Record<string, string>;
  body: unknown;
};

const invalidArguments = (message: string) =>
  new ApiConnectionException(
    message,
    ApiConnectionExceptionCode.INVALID_ARGUMENTS,
  );

const invalidConfiguration = (message: string) =>
  new ApiConnectionException(
    message,
    ApiConnectionExceptionCode.INVALID_CONFIGURATION,
  );

const stringifyScalar = (
  parameter: ApiConnectionOperationParameter,
  value: unknown,
): string => {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  throw invalidArguments(
    `Parameter "${parameter.name}" must be a string, number or boolean`,
  );
};

const setHeader = (
  headers: Record<string, string>,
  name: string,
  value: string,
): void => {
  for (const existingName of Object.keys(headers)) {
    if (isSameHttpHeaderName(existingName, name)) {
      delete headers[existingName];
    }
  }

  if (!isValidHttpHeaderValue(value)) {
    throw invalidArguments(`Header "${name}" contains invalid characters`);
  }

  headers[name] = value;
};

const buildPath = (
  operation: ApiConnectionOperation,
  args: Record<string, unknown>,
): string =>
  operation.path.replace(PATH_PLACEHOLDER_PATTERN, (_match, name: string) => {
    const parameter = operation.parameters.find(
      (candidate) => candidate.in === 'path' && candidate.name === name,
    );

    if (!isDefined(parameter)) {
      throw invalidConfiguration(
        `Path placeholder "{${name}}" in operation "${operation.name}" has no matching path parameter`,
      );
    }

    const value = stringifyScalar(parameter, args[name]);

    // encodeURIComponent leaves dots alone, so a value of ".." would still be
    // resolved as a parent segment and could escape the base path.
    if (value === '' || value === '.' || value === '..') {
      throw invalidArguments(
        `Path parameter "${name}" cannot be empty, "." or ".."`,
      );
    }

    return encodeURIComponent(value);
  });

const joinBaseUrlAndPath = (baseUrl: URL, path: string): URL => {
  const basePath = baseUrl.pathname.replace(/\/+$/, '');
  const url = new URL(`${baseUrl.origin}${basePath}${path}`);

  if (url.origin !== baseUrl.origin) {
    throw invalidArguments('The request URL must stay on the API base URL');
  }

  if (
    basePath !== '' &&
    url.pathname !== basePath &&
    !url.pathname.startsWith(`${basePath}/`)
  ) {
    throw invalidArguments('The request URL must stay under the API base path');
  }

  baseUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  return url;
};

const appendQueryParameter = (
  url: URL,
  parameter: ApiConnectionOperationParameter,
  value: unknown,
): void => {
  if (Array.isArray(value)) {
    for (const item of value) {
      url.searchParams.append(parameter.name, stringifyScalar(parameter, item));
    }

    return;
  }

  url.searchParams.append(
    parameter.name,
    typeof value === 'object' && value !== null
      ? JSON.stringify(value)
      : stringifyScalar(parameter, value),
  );
};

const buildAuthHeader = (
  config: ApiOperationRequestConfig,
): { name: string; value: string } | null => {
  if (config.authType === ApiConnectionAuthType.NONE) {
    return null;
  }

  if (!isDefined(config.secret) || config.secret === '') {
    throw invalidConfiguration('This API connection has no API key');
  }

  if (config.authType === ApiConnectionAuthType.BEARER) {
    return { name: 'Authorization', value: `Bearer ${config.secret}` };
  }

  if (!isDefined(config.authHeaderName) || config.authHeaderName === '') {
    throw invalidConfiguration(
      'This API connection needs a header name for its API key',
    );
  }

  return { name: config.authHeaderName, value: config.secret };
};

const buildBody = (
  operation: ApiConnectionOperation,
  args: Record<string, unknown>,
): unknown => {
  const bodyMode = resolveApiOperationBodyMode(operation);

  if (bodyMode === 'none') {
    return undefined;
  }

  if (bodyMode === 'nested') {
    return args[API_OPERATION_NESTED_BODY_ARGUMENT_NAME];
  }

  const parameterNames = new Set(
    operation.parameters.map((parameter) => parameter.name),
  );

  return Object.fromEntries(
    Object.entries(args).filter(
      ([name, value]) => !parameterNames.has(name) && value !== undefined,
    ),
  );
};

export const buildApiOperationRequest = ({
  config,
  operation,
  args,
}: {
  config: ApiOperationRequestConfig;
  operation: ApiConnectionOperation;
  args: Record<string, unknown>;
}): ApiOperationRequest => {
  for (const parameter of operation.parameters) {
    const value = args[parameter.name];

    if (
      (parameter.required || parameter.in === 'path') &&
      (value === undefined || value === null)
    ) {
      throw invalidArguments(`Missing required parameter "${parameter.name}"`);
    }
  }

  let baseUrl: URL;

  try {
    baseUrl = new URL(config.baseUrl);
  } catch {
    throw invalidConfiguration(`Invalid API base URL "${config.baseUrl}"`);
  }

  const url = joinBaseUrlAndPath(baseUrl, buildPath(operation, args));

  const headers: Record<string, string> = {};

  for (const [name, value] of Object.entries(config.defaultHeaders)) {
    setHeader(headers, name, value);
  }

  for (const parameter of operation.parameters) {
    const value = args[parameter.name];

    if (value === undefined || value === null) {
      continue;
    }

    if (parameter.in === 'query') {
      appendQueryParameter(url, parameter, value);
    }

    if (parameter.in === 'header') {
      setHeader(headers, parameter.name, stringifyScalar(parameter, value));
    }
  }

  const body = METHODS_WITH_BODY.has(operation.method)
    ? buildBody(operation, args)
    : undefined;

  if (isDefined(body)) {
    setHeader(headers, 'Content-Type', 'application/json');
  }

  if (
    !Object.keys(headers).some((name) => isSameHttpHeaderName(name, 'Accept'))
  ) {
    headers.Accept = 'application/json';
  }

  // Set last so neither default headers nor tool arguments can replace it.
  const authHeader = buildAuthHeader(config);

  if (isDefined(authHeader)) {
    setHeader(headers, authHeader.name, authHeader.value);
  }

  return {
    method: operation.method,
    url: url.toString(),
    headers,
    body,
  };
};
