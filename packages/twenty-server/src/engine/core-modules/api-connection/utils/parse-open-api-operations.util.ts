import { isDefined } from 'twenty-shared/utils';

import { ApiConnectionExceptionCode } from 'src/engine/core-modules/api-connection/api-connection-exception-code.enum';
import { ApiConnectionException } from 'src/engine/core-modules/api-connection/api-connection.exception';
import { API_CONNECTION_HTTP_METHODS } from 'src/engine/core-modules/api-connection/schemas/api-connection-operation.schema';
import {
  type ApiConnectionOperation,
  type ApiConnectionOperationParameter,
} from 'src/engine/core-modules/api-connection/types/api-connection-operation.type';

const MAX_REF_DEPTH = 10;
const MAX_IMPORTED_OPERATIONS = 500;
const MAX_OPERATION_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1000;

const OPEN_API_ONLY_SCHEMA_KEYS = new Set([
  'nullable',
  'example',
  'examples',
  'xml',
  'externalDocs',
  'discriminator',
  'deprecated',
]);

type JsonObject = Record<string, unknown>;

export type OpenApiImportResult = {
  operations: ApiConnectionOperation[];
  skipped: string[];
  suggestedBaseUrl: string | null;
};

const importFailed = (message: string) =>
  new ApiConnectionException(
    message,
    ApiConnectionExceptionCode.OPEN_API_IMPORT_FAILED,
  );

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const resolveLocalRef = (document: JsonObject, ref: string): unknown => {
  if (!ref.startsWith('#/')) {
    return undefined;
  }

  return ref
    .slice(2)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce<unknown>(
      (current, segment) =>
        isJsonObject(current) ? current[segment] : undefined,
      document,
    );
};

// Resolves local $refs and turns OpenAPI 3.0 schema keywords into plain JSON
// Schema. Remote refs and cycles past MAX_REF_DEPTH degrade to an open schema.
const toJsonSchema = (
  document: JsonObject,
  value: unknown,
  depth = 0,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => toJsonSchema(document, item, depth));
  }

  if (!isJsonObject(value)) {
    return value;
  }

  if (typeof value.$ref === 'string') {
    if (depth >= MAX_REF_DEPTH) {
      return {};
    }

    const resolved = resolveLocalRef(document, value.$ref);

    return isDefined(resolved)
      ? toJsonSchema(document, resolved, depth + 1)
      : {};
  }

  const converted: JsonObject = {};

  for (const [key, child] of Object.entries(value)) {
    if (OPEN_API_ONLY_SCHEMA_KEYS.has(key)) {
      continue;
    }

    converted[key] = toJsonSchema(document, child, depth);
  }

  if (value.nullable === true && typeof converted.type === 'string') {
    converted.type = [converted.type, 'null'];
  }

  return converted;
};

const resolveObject = (
  document: JsonObject,
  value: unknown,
): JsonObject | null => {
  let current = value;

  for (let depth = 0; depth < MAX_REF_DEPTH; depth++) {
    if (!isJsonObject(current)) {
      return null;
    }

    if (typeof current.$ref !== 'string') {
      return current;
    }

    current = resolveLocalRef(document, current.$ref);
  }

  return null;
};

export const toApiOperationName = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_OPERATION_NAME_LENGTH)
    .replace(/_+$/g, '');

const buildUniqueName = (candidate: string, usedNames: Set<string>): string => {
  const base = candidate === '' ? 'operation' : candidate;
  let name = base;
  let suffix = 2;

  while (usedNames.has(name)) {
    const suffixText = `_${suffix}`;

    name = `${base.slice(0, MAX_OPERATION_NAME_LENGTH - suffixText.length)}${suffixText}`;
    suffix++;
  }

  usedNames.add(name);

  return name;
};

const buildParameters = (
  document: JsonObject,
  rawParameters: unknown[],
): ApiConnectionOperationParameter[] => {
  const byKey = new Map<string, ApiConnectionOperationParameter>();

  for (const rawParameter of rawParameters) {
    const parameter = resolveObject(document, rawParameter);

    if (
      !isDefined(parameter) ||
      typeof parameter.name !== 'string' ||
      (parameter.in !== 'path' &&
        parameter.in !== 'query' &&
        parameter.in !== 'header')
    ) {
      continue;
    }

    const schema = toJsonSchema(document, parameter.schema);

    byKey.set(`${parameter.in}:${parameter.name}`, {
      name: parameter.name,
      in: parameter.in,
      required: parameter.in === 'path' || parameter.required === true,
      ...(typeof parameter.description === 'string' && {
        description: parameter.description,
      }),
      ...(isJsonObject(schema) && { schema }),
    });
  }

  return [...byKey.values()];
};

const findJsonMediaTypeSchema = (
  document: JsonObject,
  rawRequestBody: unknown,
): { hasBody: boolean; schema: JsonObject | null } => {
  const requestBody = resolveObject(document, rawRequestBody);

  if (!isDefined(requestBody) || !isJsonObject(requestBody.content)) {
    return { hasBody: false, schema: null };
  }

  const jsonMediaType = Object.entries(requestBody.content).find(
    ([mediaType]) =>
      mediaType === 'application/json' || mediaType.endsWith('+json'),
  );

  if (!isDefined(jsonMediaType)) {
    return { hasBody: true, schema: null };
  }

  const mediaTypeObject = jsonMediaType[1];
  const schema = isJsonObject(mediaTypeObject)
    ? toJsonSchema(document, mediaTypeObject.schema ?? {})
    : {};

  return { hasBody: true, schema: isJsonObject(schema) ? schema : {} };
};

const buildDescription = (operation: JsonObject): string =>
  [operation.summary, operation.description]
    .filter(
      (part): part is string => typeof part === 'string' && part.trim() !== '',
    )
    .map((part) => part.trim())
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join('\n\n')
    .slice(0, MAX_DESCRIPTION_LENGTH);

const findSuggestedBaseUrl = (document: JsonObject): string | null => {
  if (!Array.isArray(document.servers)) {
    return null;
  }

  const server = document.servers.find(
    (candidate): candidate is JsonObject =>
      isJsonObject(candidate) &&
      typeof candidate.url === 'string' &&
      /^https?:\/\//.test(candidate.url),
  );

  return typeof server?.url === 'string' ? server.url : null;
};

export const parseOpenApiDocumentText = (text: string): JsonObject => {
  const trimmed = text.trim();

  if (!trimmed.startsWith('{')) {
    throw importFailed(
      'Only JSON OpenAPI documents are supported. Convert YAML to JSON first.',
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw importFailed('The OpenAPI document is not valid JSON');
  }

  if (!isJsonObject(parsed)) {
    throw importFailed('The OpenAPI document must be a JSON object');
  }

  return parsed;
};

export const parseOpenApiOperations = (
  document: JsonObject,
): OpenApiImportResult => {
  if (isDefined(document.swagger)) {
    throw importFailed(
      'Swagger 2.0 documents are not supported. Use an OpenAPI 3.x document.',
    );
  }

  if (
    typeof document.openapi !== 'string' ||
    !document.openapi.startsWith('3.')
  ) {
    throw importFailed('The document is not an OpenAPI 3.x document');
  }

  if (!isJsonObject(document.paths)) {
    throw importFailed('The OpenAPI document has no paths');
  }

  const operations: ApiConnectionOperation[] = [];
  const skipped: string[] = [];
  const usedNames = new Set<string>();

  for (const [path, rawPathItem] of Object.entries(document.paths)) {
    const pathItem = resolveObject(document, rawPathItem);

    if (!isDefined(pathItem)) {
      continue;
    }

    const pathLevelParameters = Array.isArray(pathItem.parameters)
      ? pathItem.parameters
      : [];

    for (const method of API_CONNECTION_HTTP_METHODS) {
      const operation = pathItem[method.toLowerCase()];

      if (!isJsonObject(operation)) {
        continue;
      }

      const label = `${method} ${path}`;

      if (!path.startsWith('/')) {
        skipped.push(`${label}: path must start with /`);
        continue;
      }

      const { hasBody, schema } = findJsonMediaTypeSchema(
        document,
        operation.requestBody,
      );

      if (hasBody && !isDefined(schema)) {
        skipped.push(`${label}: request body is not JSON`);
        continue;
      }

      if (operations.length >= MAX_IMPORTED_OPERATIONS) {
        skipped.push(
          `${label}: more than ${MAX_IMPORTED_OPERATIONS} operations`,
        );
        continue;
      }

      const operationParameters = Array.isArray(operation.parameters)
        ? operation.parameters
        : [];

      const nameCandidate =
        typeof operation.operationId === 'string'
          ? toApiOperationName(operation.operationId)
          : toApiOperationName(`${method}_${path}`);

      const placeholders = [...path.matchAll(/\{([^{}]+)\}/g)].map(
        (match) => match[1],
      );

      const parameters = buildParameters(document, [
        ...pathLevelParameters,
        ...operationParameters,
      ]).filter(
        (parameter) =>
          parameter.in !== 'path' || placeholders.includes(parameter.name),
      );

      for (const placeholder of placeholders) {
        const isDeclared = parameters.some(
          (parameter) =>
            parameter.in === 'path' && parameter.name === placeholder,
        );

        if (!isDeclared) {
          parameters.push({
            name: placeholder,
            in: 'path',
            required: true,
            schema: { type: 'string' },
          });
        }
      }

      operations.push({
        name: buildUniqueName(nameCandidate, usedNames),
        description: buildDescription(operation) || label,
        method,
        path,
        parameters,
        requestBodySchema: schema,
        isEnabled: false,
      });
    }
  }

  if (operations.length === 0 && skipped.length === 0) {
    throw importFailed('The OpenAPI document has no operations');
  }

  return {
    operations,
    skipped,
    suggestedBaseUrl: findSuggestedBaseUrl(document),
  };
};
