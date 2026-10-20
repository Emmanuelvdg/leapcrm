import { isNonEmptyString } from '@sniptt/guards';
import { getCountries } from 'libphonenumber-js';
import { isValidCountryCode } from 'twenty-shared/utils';

// CRM addresses store the English country name produced by the address input
// (Intl display names over the libphonenumber country list), so the same
// source is used to turn it back into a code.
const COUNTRY_CODE_BY_ENGLISH_NAME = (() => {
  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

  return new Map(
    getCountries().flatMap((countryCode) => {
      const countryName = regionNames.of(countryCode);

      return countryName ? [[countryName.toLowerCase(), countryCode]] : [];
    }),
  );
})();

export const normalizeCountryCode = (
  countryCodeOrName: string | null | undefined,
): string | null => {
  if (!isNonEmptyString(countryCodeOrName)) {
    return null;
  }

  const trimmedValue = countryCodeOrName.trim();
  const upperCaseValue = trimmedValue.toUpperCase();

  if (isValidCountryCode(upperCaseValue)) {
    return upperCaseValue;
  }

  return COUNTRY_CODE_BY_ENGLISH_NAME.get(trimmedValue.toLowerCase()) ?? null;
};
