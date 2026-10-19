import { isNonEmptyString } from '@sniptt/guards';
import { getUrlHostnameOrThrow } from 'twenty-shared/utils';

export const extractDiscoveryDomain = (
  website: string | null | undefined,
): string | null => {
  if (!isNonEmptyString(website)) {
    return null;
  }

  try {
    return getUrlHostnameOrThrow(website.trim())
      .toLowerCase()
      .replace(/^www\./, '');
  } catch {
    return null;
  }
};
