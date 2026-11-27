import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export const generateAccessToken = (): string =>
  randomBytes(24).toString('base64url');

export const tokensMatch = (
  expected: string | null | undefined,
  provided: string | null | undefined,
): boolean => {
  if (!expected || !provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
};

// Caddy overwrites X-Forwarded-For with the real client address but passes
// X-Real-IP and CF-Connecting-IP through from the client untouched.
export const getVisitorIp = (
  headers: Record<string, string | undefined>,
): string | null =>
  headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  headers['cf-connecting-ip']?.trim() ||
  headers['x-real-ip']?.trim() ||
  null;

// The signer's address is kept only as a hash: enough to show two signatures
// came from the same place without storing personal data.
export const hashSignerIp = (
  ip: string | null,
  quoteId: string,
): string | null =>
  ip === null
    ? null
    : createHash('sha256').update(`${quoteId}|${ip}`).digest('hex');

const SIGNATURE_PATH_PATTERN = /^[MLml0-9.,\s-]+$/;
const MAX_SIGNATURE_LENGTH = 40_000;

// The signature is drawn on the public page and comes back as SVG path data;
// anything but move/line commands and numbers is refused.
export const sanitizeSignaturePath = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 &&
    trimmed.length <= MAX_SIGNATURE_LENGTH &&
    SIGNATURE_PATH_PATTERN.test(trimmed) &&
    /[Ll]/.test(trimmed)
    ? trimmed
    : null;
};

export const decodeJwtClaims = (
  token: string,
): { userId?: string; userWorkspaceId?: string } => {
  const payload = token.split('.')[1];

  if (!payload) {
    return {};
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as unknown;

    return parsed !== null && typeof parsed === 'object'
      ? (parsed as { userId?: string; userWorkspaceId?: string })
      : {};
  } catch {
    return {};
  }
};
