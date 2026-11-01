export const REDACTION_SENTINEL = '[redacted]';

const SENSITIVE_KEY_REGEX =
  /^(password|passwd|pwd|.*_?token|.*_?secret|authorization|api[_-]?key|private[_-]?key|client[_-]?secret|x-?api-?key|x-?auth-?token|access[_-]?key)$/i;

const isSensitiveKey = (name: string): boolean =>
  SENSITIVE_KEY_REGEX.test(name);

export const redactSensitiveKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveKeysDeep);
  }

  if (value !== null && typeof value === 'object') {
    const redacted: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        redacted[key] = REDACTION_SENTINEL;
        continue;
      }

      redacted[key] = redactSensitiveKeysDeep(nested);
    }

    return redacted;
  }

  return value;
};
