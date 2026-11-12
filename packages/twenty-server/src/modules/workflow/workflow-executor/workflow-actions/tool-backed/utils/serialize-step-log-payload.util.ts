import { truncateStringToUtf8ByteBudget } from 'src/utils/truncate-string-to-utf8-byte-budget.util';

const MAX_PAYLOAD_BYTES = 32_000;

export type SerializedStepLogPayload = {
  value: string | undefined;
  bytes: number | undefined;
  truncated: boolean;
};

export const serializeStepLogPayload = (
  payload: unknown,
): SerializedStepLogPayload => {
  if (payload === undefined || payload === null || payload === '') {
    return { value: undefined, bytes: undefined, truncated: false };
  }

  const serialized =
    typeof payload === 'string' ? payload : JSON.stringify(payload);

  const { value, originalBytes, truncated } = truncateStringToUtf8ByteBudget(
    serialized,
    MAX_PAYLOAD_BYTES,
  );

  return { value, bytes: originalBytes, truncated };
};
