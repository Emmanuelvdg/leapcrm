const MIN_KEY_LENGTH = 3;

// Trailing legal-form words that make the same company look different
// ("Acme Pte. Ltd." vs "ACME"). Only stripped from the end of the name.
const COMPANY_LEGAL_SUFFIXES = new Set([
  'ab',
  'ag',
  'bhd',
  'bv',
  'co',
  'company',
  'corp',
  'corporation',
  'gmbh',
  'inc',
  'incorporated',
  'limited',
  'llc',
  'llp',
  'lp',
  'ltd',
  'plc',
  'private',
  'pte',
  'pty',
  'pvt',
  'sa',
  'sarl',
  'sas',
  'sdn',
  'srl',
]);

// Many small businesses use a social page as their website, so the host alone
// would make unrelated companies look like duplicates.
const SHARED_HOSTS = new Set([
  'facebook.com',
  'fb.com',
  'instagram.com',
  'linkedin.com',
  'linktr.ee',
  'sites.google.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'youtube.com',
]);

const toWords = (value: string): string[] =>
  value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0);

const keepIfLongEnough = (key: string): string | null =>
  key.length >= MIN_KEY_LENGTH ? key : null;

export const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

export const toCompanyNameKey = (
  name: string | null | undefined,
): string | null => {
  if (!name) {
    return null;
  }

  const words = toWords(name);

  while (
    words.length > 1 &&
    COMPANY_LEGAL_SUFFIXES.has(words[words.length - 1])
  ) {
    words.pop();
  }

  return keepIfLongEnough(words.join(' '));
};

const stripUrlDecorations = (url: string): string =>
  url
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/^www\./, '');

export const toDomainKey = (url: string | null | undefined): string | null => {
  if (!url) {
    return null;
  }

  const [hostWithPort, ...pathParts] =
    stripUrlDecorations(url).split(/[/?#]/);
  const host = hostWithPort.replace(/:\d+$/, '').replace(/\.$/, '');

  if (!host.includes('.')) {
    return null;
  }

  if (SHARED_HOSTS.has(host)) {
    const firstPathPart = pathParts.find((part) => part.length > 0);

    return firstPathPart ? `${host}/${firstPathPart}` : null;
  }

  return keepIfLongEnough(host);
};

export const toEmailKey = (email: string | null | undefined): string | null => {
  const key = email?.trim().toLowerCase() ?? '';

  return key.includes('@') ? key : null;
};

export const toLinkedinKey = (
  url: string | null | undefined,
): string | null => {
  if (!url) {
    return null;
  }

  const key = stripUrlDecorations(url)
    .split(/[?#]/)[0]
    .replace(/\/+$/, '');

  return key.includes('linkedin.com/') ? key : null;
};

export const toPersonNameKey = (
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string | null =>
  keepIfLongEnough(toWords(`${firstName ?? ''} ${lastName ?? ''}`).join(' '));
