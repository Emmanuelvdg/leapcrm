import { createHash } from 'crypto';

import { MIN_FILL_SECONDS } from 'src/constants/lead-capture-settings';

const toHostname = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const normalizeDomain = (domain: string): string =>
  domain
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/:].*$/, '');

export const parseAllowedDomains = (value: string | null): string[] =>
  (value ?? '')
    .split(/[\s,;]+/)
    .map(normalizeDomain)
    .filter((domain) => domain.length > 0);

// A browser always sends Origin or Referer, so a cross-site form on a website
// that is not listed is refused. Requests without either (a server posting
// on a customer's behalf) are let through: those headers prove nothing there.
export const isRequestFromAllowedSite = ({
  allowedDomains,
  origin,
  referer,
  formHost,
}: {
  allowedDomains: string[];
  origin: string | null;
  referer: string | null;
  formHost: string | null;
}): boolean => {
  if (allowedDomains.length === 0) {
    return true;
  }

  const requestHost = toHostname(origin) ?? toHostname(referer);

  if (requestHost === null) {
    return true;
  }

  const formHostname = formHost?.toLowerCase().replace(/:\d+$/, '') ?? null;

  if (requestHost === formHostname) {
    return true;
  }

  const requestDomain = requestHost.replace(/^www\./, '');

  return allowedDomains.some(
    (domain) =>
      requestDomain === domain || requestDomain.endsWith(`.${domain}`),
  );
};

export const isSubmittedTooFast = ({
  renderedAtMs,
  nowMs,
}: {
  renderedAtMs: number | null;
  nowMs: number;
}): boolean =>
  renderedAtMs !== null && nowMs - renderedAtMs < MIN_FILL_SECONDS * 1000;

// The production proxy (Caddy) replaces X-Forwarded-For with the real client
// address but passes X-Real-IP and CF-Connecting-IP through untouched, so a
// spammer could set those to dodge the rate limit.
export const getVisitorIp = (
  headers: Record<string, string | undefined>,
): string | null =>
  headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  headers['cf-connecting-ip']?.trim() ||
  headers['x-real-ip']?.trim() ||
  null;

// Only a salted hash is kept, enough to count repeat posts from one visitor
// without storing their IP address.
export const hashVisitor = ({
  ip,
  userAgent,
  formId,
}: {
  ip: string | null;
  userAgent: string | null;
  formId: string;
}): string | null =>
  ip === null
    ? null
    : createHash('sha256')
        .update(`${formId}|${ip}|${userAgent ?? ''}`)
        .digest('hex');
