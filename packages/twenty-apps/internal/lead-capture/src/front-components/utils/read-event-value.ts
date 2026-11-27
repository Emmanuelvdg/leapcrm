import { type SyntheticEvent } from 'react';

// The front component sandbox dispatches events with a non-standard shape:
// the value may be on event.detail, on the event itself, or on its target.
export const readEventValue = (
  event: SyntheticEvent<HTMLElement>,
): string | undefined => {
  const serialized = event as unknown as {
    detail?: { value?: unknown };
    value?: unknown;
    target?: { value?: unknown };
  };

  for (const candidate of [
    serialized.detail?.value,
    serialized.value,
    serialized.target?.value,
  ]) {
    if (typeof candidate === 'string') {
      return candidate;
    }
  }

  return undefined;
};

export const onValueChange =
  (setValue: (value: string) => void) =>
  (event: SyntheticEvent<HTMLElement>) => {
    const value = readEventValue(event);

    if (value !== undefined) {
      setValue(value);
    }
  };
