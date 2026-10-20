import { isNonEmptyString } from '@sniptt/guards';

const LEI_PATTERN = /^[A-Z0-9]{18}\d{2}$/;

// ISO 17442 check digits use ISO 7064 MOD 97-10: letters become 10 to 35 and
// the whole code, read as a number, leaves remainder 1 when divided by 97.
const hasValidLeiCheckDigits = (lei: string): boolean => {
  let remainder = 0;

  for (const character of lei) {
    const digits = /\d/.test(character)
      ? character
      : String(character.charCodeAt(0) - 55);

    for (const digit of digits) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }

  return remainder === 1;
};

export const normalizeLei = (lei: string | null | undefined): string | null => {
  if (!isNonEmptyString(lei)) {
    return null;
  }

  const normalizedLei = lei.replace(/\s+/g, '').toUpperCase();

  return LEI_PATTERN.test(normalizedLei) &&
    hasValidLeiCheckDigits(normalizedLei)
    ? normalizedLei
    : null;
};
