import { isNonEmptyString } from '@sniptt/guards';

import {
  COMPANY_LEGAL_PREFIXES_BY_COUNTRY,
  COMPANY_LEGAL_SUFFIXES_BY_COUNTRY,
  GENERIC_COMPANY_LEGAL_SUFFIXES,
} from 'src/modules/prospecting/identity-resolution/constants/company-legal-forms-by-country.constant';

const normalizeCompanyNameText = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const getLegalSuffixes = (countryCode: string | null): string[] =>
  [
    ...GENERIC_COMPANY_LEGAL_SUFFIXES,
    ...(countryCode
      ? (COMPANY_LEGAL_SUFFIXES_BY_COUNTRY[countryCode] ?? [])
      : []),
  ].sort((first, second) => second.length - first.length);

const stripLegalForms = ({
  name,
  suffixes,
  prefixes,
}: {
  name: string;
  suffixes: string[];
  prefixes: string[];
}): string => {
  let strippedName = name;
  let hasStripped = true;

  // Repeated because names stack forms, for example "ACME HOLDINGS CO LTD".
  while (hasStripped) {
    hasStripped = false;

    for (const suffix of suffixes) {
      if (strippedName.endsWith(` ${suffix}`)) {
        strippedName = strippedName.slice(0, -(suffix.length + 1));
        hasStripped = true;
        break;
      }
    }

    for (const prefix of prefixes) {
      if (strippedName.startsWith(`${prefix} `)) {
        strippedName = strippedName.slice(prefix.length + 1);
        hasStripped = true;
        break;
      }
    }
  }

  return strippedName.replace(/^THE /, '');
};

// Only ever used to propose a match for review; names never merge companies
// on their own.
export const normalizeCompanyName = ({
  name,
  countryCode,
}: {
  name: string | null | undefined;
  countryCode: string | null;
}): string | null => {
  if (!isNonEmptyString(name)) {
    return null;
  }

  const normalizedText = normalizeCompanyNameText(name);
  const strippedName = stripLegalForms({
    name: normalizedText,
    suffixes: getLegalSuffixes(countryCode),
    prefixes: countryCode
      ? (COMPANY_LEGAL_PREFIXES_BY_COUNTRY[countryCode] ?? [])
      : [],
  });

  // A name made only of a legal form ("Limited") keeps its text rather than
  // collapsing to nothing.
  const normalizedName =
    strippedName.length > 0 ? strippedName : normalizedText;

  return normalizedName.length > 0 ? normalizedName : null;
};
