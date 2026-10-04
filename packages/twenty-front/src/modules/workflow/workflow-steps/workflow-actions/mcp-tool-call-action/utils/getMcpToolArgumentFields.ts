import { type McpToolArgumentField } from '@/workflow/workflow-steps/workflow-actions/mcp-tool-call-action/types/McpToolArgumentField';
import { isDefined } from 'twenty-shared/utils';

type JsonSchemaProperty = {
  type?: string | string[];
  description?: string;
};

type JsonSchemaObject = {
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  isDefined(value) && typeof value === 'object' && !Array.isArray(value);

const getPrimaryType = (type: JsonSchemaProperty['type']): string =>
  (Array.isArray(type)
    ? type.find((candidate) => candidate !== 'null')
    : type) ?? 'string';

export const getMcpToolArgumentFields = (
  inputSchema: unknown,
): McpToolArgumentField[] => {
  if (!isPlainObject(inputSchema)) {
    return [];
  }

  const { properties, required } = inputSchema as JsonSchemaObject;

  if (!isPlainObject(properties)) {
    return [];
  }

  const requiredNames = new Set(Array.isArray(required) ? required : []);

  return Object.entries(properties).map(([name, property]) => ({
    name,
    type: getPrimaryType(property?.type),
    description: property?.description,
    isRequired: requiredNames.has(name),
  }));
};
