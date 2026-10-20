type RegistrationNumberFormat = {
  pattern: RegExp;
  normalize?: (registrationNumber: string) => string;
};

// Companies House drops leading zeros in some sources (1234567 for 01234567).
const padCompaniesHouseNumber = (registrationNumber: string) =>
  /^\d{1,8}$/.test(registrationNumber)
    ? registrationNumber.padStart(8, '0')
    : registrationNumber;

// Keyed by GLEIF registration authority code. Authorities without an entry
// still match on their cleaned-up number, without a format check.
export const REGISTRATION_NUMBER_FORMATS: Record<
  string,
  RegistrationNumberFormat
> = {
  // Singapore UEN: business (8 digits + letter), local company (9 digits +
  // letter) or other entity (T/S/R, year, entity type, 4 digits, letter).
  RA000523: {
    pattern: /^(\d{8}[A-Z]|\d{9}[A-Z]|[TSR]\d{2}[A-Z]{2}\d{4}[A-Z])$/,
  },
  // Companies House: England and Wales, Northern Ireland, Scotland.
  RA000585: {
    pattern: /^(\d{8}|[A-Z]{2}\d{6})$/,
    normalize: padCompaniesHouseNumber,
  },
  RA000586: {
    pattern: /^(\d{8}|[A-Z]{2}\d{6}|R\d{7})$/,
    normalize: padCompaniesHouseNumber,
  },
  RA000587: {
    pattern: /^[A-Z]{2}\d{6}$/,
  },
};
