import { COUNTRY_CALLING_CODES } from 'src/constants/country-calling-codes';

export type PhoneInput = {
  // Calling code plus national number, digits only, for matching contacts.
  internationalDigits: string;
  // What the CRM's phone field accepts; the server parses and normalizes it.
  apiValue: {
    primaryPhoneNumber: string;
    primaryPhoneCountryCode?: string;
  };
};

const toDigits = (value: string): string => value.replace(/\D/g, '');

export const parsePhoneInput = (
  input: string,
  defaultCountry: string,
): PhoneInput | undefined => {
  const trimmed = input.trim();
  const digits = toDigits(trimmed);

  if (digits.length < 7) {
    return undefined;
  }

  if (trimmed.startsWith('+') || trimmed.startsWith('00')) {
    const internationalDigits = trimmed.startsWith('00')
      ? digits.slice(2)
      : digits;

    return {
      internationalDigits,
      apiValue: { primaryPhoneNumber: `+${internationalDigits}` },
    };
  }

  const callingCode = COUNTRY_CALLING_CODES[defaultCountry.toUpperCase()];
  const withoutTrunkPrefix = digits.replace(/^0+/, '');

  // Typed with the country code but no "+", e.g. 919876543210 in India.
  if (
    callingCode !== undefined &&
    withoutTrunkPrefix.startsWith(callingCode) &&
    withoutTrunkPrefix.length > 10
  ) {
    return {
      internationalDigits: withoutTrunkPrefix,
      apiValue: { primaryPhoneNumber: `+${withoutTrunkPrefix}` },
    };
  }

  return {
    internationalDigits: `${callingCode ?? ''}${withoutTrunkPrefix}`,
    apiValue: {
      primaryPhoneNumber: withoutTrunkPrefix,
      primaryPhoneCountryCode: defaultCountry.toUpperCase(),
    },
  };
};

export type StoredPhones = {
  primaryPhoneNumber: string | null;
  primaryPhoneCallingCode: string | null;
  additionalPhones:
    | { number?: string | null; callingCode?: string | null }[]
    | null;
};

const MIN_NATIONAL_DIGITS_FOR_SUFFIX_MATCH = 8;

const matchesNumber = (
  number: string | null | undefined,
  callingCode: string | null | undefined,
  internationalDigits: string,
): boolean => {
  const nationalDigits = toDigits(number ?? '').replace(/^0+/, '');

  if (nationalDigits.length === 0) {
    return false;
  }

  if (
    `${toDigits(callingCode ?? '')}${nationalDigits}` === internationalDigits
  ) {
    return true;
  }

  // Older records sometimes lack a calling code; the national number alone
  // still identifies the contact when it is long enough.
  return (
    !toDigits(callingCode ?? '') &&
    nationalDigits.length >= MIN_NATIONAL_DIGITS_FOR_SUFFIX_MATCH &&
    internationalDigits.endsWith(nationalDigits)
  );
};

export const phonesMatch = (
  stored: StoredPhones,
  internationalDigits: string,
): boolean =>
  matchesNumber(
    stored.primaryPhoneNumber,
    stored.primaryPhoneCallingCode,
    internationalDigits,
  ) ||
  (stored.additionalPhones ?? []).some((phone) =>
    matchesNumber(phone.number, phone.callingCode, internationalDigits),
  );

// Enough of the number to narrow the database search; the exact comparison
// happens in phonesMatch.
export const getPhoneSearchFragment = (internationalDigits: string): string =>
  internationalDigits.slice(-7);
