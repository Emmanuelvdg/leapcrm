import { isNonEmptyString } from '@sniptt/guards';

import { REGISTRATION_NUMBER_FORMATS } from 'src/modules/prospecting/identity-resolution/constants/registration-number-formats.constant';

export type NormalizedRegistration = {
  authority: string;
  number: string;
};

// A number is only meaningful together with the registry that issued it, so
// both are required; a number that fails its registry's format is dropped
// rather than trusted.
export const normalizeRegistrationNumber = ({
  authority,
  registrationNumber,
}: {
  authority: string | null | undefined;
  registrationNumber: string | null | undefined;
}): NormalizedRegistration | null => {
  if (!isNonEmptyString(authority) || !isNonEmptyString(registrationNumber)) {
    return null;
  }

  const normalizedAuthority = authority.trim().toUpperCase();
  const cleanedNumber = registrationNumber
    .toUpperCase()
    .replace(/[\s.\-/]/g, '');
  const format = REGISTRATION_NUMBER_FORMATS[normalizedAuthority];
  const normalizedNumber = format?.normalize?.(cleanedNumber) ?? cleanedNumber;

  const isValid = format
    ? format.pattern.test(normalizedNumber)
    : /^[A-Z0-9]{2,40}$/.test(normalizedNumber);

  return isValid
    ? { authority: normalizedAuthority, number: normalizedNumber }
    : null;
};
