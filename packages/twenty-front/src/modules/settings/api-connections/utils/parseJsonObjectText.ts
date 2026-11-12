export type ParsedJsonObjectText =
  | { isValid: true; value: Record<string, unknown> | null }
  | { isValid: false; value: null };

// An empty text is valid and means "no value".
export const parseJsonObjectText = (text: string): ParsedJsonObjectText => {
  if (text.trim() === '') {
    return { isValid: true, value: null };
  }

  try {
    const parsed: unknown = JSON.parse(text);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return { isValid: true, value: parsed as Record<string, unknown> };
    }
  } catch {
    return { isValid: false, value: null };
  }

  return { isValid: false, value: null };
};
