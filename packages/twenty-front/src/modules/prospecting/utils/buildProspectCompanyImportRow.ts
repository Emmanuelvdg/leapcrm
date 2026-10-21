import { isNonEmptyString } from '@sniptt/guards';

import { type ImportedStructuredRow } from '@/spreadsheet-import/types/SpreadsheetImportImportedStructuredRow';
import { type ImportProspectCompanyInput } from '~/generated-metadata/graphql';

const toTrimmedString = (value: string | boolean | undefined) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const toEmployeeCount = (value: string | boolean | undefined) => {
  const employeeCount = Number.parseInt(toTrimmedString(value) ?? '', 10);

  return Number.isInteger(employeeCount) && employeeCount >= 0
    ? employeeCount
    : undefined;
};

export const buildProspectCompanyImportRow = (
  row: ImportedStructuredRow,
): ImportProspectCompanyInput | null => {
  const name = toTrimmedString(row.name);

  if (!isNonEmptyString(name)) {
    return null;
  }

  return {
    name,
    domain: toTrimmedString(row.domain),
    country: toTrimmedString(row.country),
    registrationNumber: toTrimmedString(row.registrationNumber),
    registrationAuthority: toTrimmedString(row.registrationAuthority),
    lei: toTrimmedString(row.lei),
    industry: toTrimmedString(row.industry),
    employeeCount: toEmployeeCount(row.employeeCount),
  };
};
