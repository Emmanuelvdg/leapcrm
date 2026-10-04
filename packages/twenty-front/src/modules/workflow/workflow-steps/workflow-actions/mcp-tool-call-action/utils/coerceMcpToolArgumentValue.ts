import { isNonEmptyString } from '@sniptt/guards';

const containsVariable = (value: string) => value.includes('{{');

// MCP servers validate arguments against their JSON Schema, so literal
// numbers, booleans and JSON must not be sent as strings. Values containing
// variables stay strings and are resolved at run time.
export const coerceMcpToolArgumentValue = (
  value: string | null,
  type: string,
): unknown => {
  if (!isNonEmptyString(value)) {
    return undefined;
  }

  if (containsVariable(value)) {
    return value;
  }

  const trimmedValue = value.trim();

  switch (type) {
    case 'number':
    case 'integer': {
      const parsedNumber = Number(trimmedValue);

      return trimmedValue !== '' && Number.isFinite(parsedNumber)
        ? parsedNumber
        : value;
    }
    case 'boolean':
      if (trimmedValue === 'true') {
        return true;
      }

      if (trimmedValue === 'false') {
        return false;
      }

      return value;
    case 'object':
    case 'array':
      try {
        return JSON.parse(trimmedValue);
      } catch {
        return value;
      }
    default:
      return value;
  }
};
