import { isNonEmptyString } from '@sniptt/guards';
import { isValidHostname } from 'twenty-shared/utils';

import { SHARED_PLATFORM_DOMAINS } from 'src/modules/prospecting/identity-resolution/constants/shared-platform-domains.constant';

// Accepts a bare domain or a full URL. URL parsing lower-cases the host and
// converts international domain names to punycode.
export const normalizeCompanyDomain = (
  websiteOrDomain: string | null | undefined,
): string | null => {
  if (!isNonEmptyString(websiteOrDomain)) {
    return null;
  }

  const trimmedValue = websiteOrDomain.trim();
  const valueWithScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  let hostname: string;

  try {
    hostname = new URL(valueWithScheme).hostname;
  } catch {
    return null;
  }

  const domain = hostname.replace(/\.$/, '').replace(/^www\./, '');

  if (
    !domain.includes('.') ||
    !isValidHostname(domain, { allowIp: false, allowLocalhost: false }) ||
    SHARED_PLATFORM_DOMAINS.has(domain)
  ) {
    return null;
  }

  return domain;
};
