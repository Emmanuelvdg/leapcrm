import {
  type ApiConnectionHttpMethod,
  type ApiConnectionOperation,
  type ApiConnectionOperationParameter,
} from '@/settings/api-connections/types/ApiConnectionOperation';
import { parseJsonObjectText } from '@/settings/api-connections/utils/parseJsonObjectText';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

export type ApiConnectionOperationDraft = {
  name: string;
  description: string;
  method: ApiConnectionHttpMethod;
  path: string;
  parametersJson: string;
  requestBodySchemaJson: string;
  isEnabled: boolean;
};

const OPERATION_NAME_PATTERN = /^[a-z0-9_]+$/;
const PARAMETER_LOCATIONS = new Set(['path', 'query', 'header']);

export const EMPTY_API_CONNECTION_OPERATION_DRAFT: ApiConnectionOperationDraft =
  {
    name: '',
    description: '',
    method: 'GET',
    path: '/',
    parametersJson: '[]',
    requestBodySchemaJson: '',
    isEnabled: true,
  };

export const toApiConnectionOperationDraft = (
  operation: ApiConnectionOperation,
): ApiConnectionOperationDraft => ({
  name: operation.name,
  description: operation.description,
  method: operation.method,
  path: operation.path,
  parametersJson: JSON.stringify(operation.parameters, null, 2),
  requestBodySchemaJson: isDefined(operation.requestBodySchema)
    ? JSON.stringify(operation.requestBodySchema, null, 2)
    : '',
  isEnabled: operation.isEnabled,
});

const isParameter = (
  value: unknown,
): value is ApiConnectionOperationParameter => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.name === 'string' &&
    candidate.name !== '' &&
    typeof candidate.in === 'string' &&
    PARAMETER_LOCATIONS.has(candidate.in) &&
    typeof candidate.required === 'boolean'
  );
};

// Returns an error message to show next to the editor, or the operation.
export const parseApiConnectionOperationDraft = (
  draft: ApiConnectionOperationDraft,
):
  | { operation: ApiConnectionOperation; error: null }
  | { operation: null; error: string } => {
  const name = draft.name.trim();

  if (!OPERATION_NAME_PATTERN.test(name)) {
    return {
      operation: null,
      error: t`Name must use lowercase letters, digits and underscores`,
    };
  }

  const path = draft.path.trim();

  if (!path.startsWith('/')) {
    return { operation: null, error: t`Path must start with /` };
  }

  let parameters: unknown;

  try {
    parameters =
      draft.parametersJson.trim() === ''
        ? []
        : JSON.parse(draft.parametersJson);
  } catch {
    return { operation: null, error: t`Parameters must be valid JSON` };
  }

  if (!Array.isArray(parameters) || !parameters.every(isParameter)) {
    return {
      operation: null,
      error: t`Parameters must be a list of objects with name, in (path, query or header) and required`,
    };
  }

  const requestBodySchema = parseJsonObjectText(draft.requestBodySchemaJson);

  if (!requestBodySchema.isValid) {
    return {
      operation: null,
      error: t`Request body schema must be a JSON object`,
    };
  }

  return {
    operation: {
      name,
      description: draft.description.trim(),
      method: draft.method,
      path,
      parameters,
      requestBodySchema: requestBodySchema.value,
      isEnabled: draft.isEnabled,
    },
    error: null,
  };
};
