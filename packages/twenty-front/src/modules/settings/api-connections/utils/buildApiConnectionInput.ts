import { parseJsonObjectText } from '@/settings/api-connections/utils/parseJsonObjectText';
import { type ApiConnectionFormValues } from '@/settings/api-connections/validation-schemas/apiConnectionFormSchema';
import { isNonEmptyString } from '@sniptt/guards';
import { type ApiConnectionAuthType } from '~/generated-metadata/graphql';

export type ApiConnectionInput = {
  name: string;
  baseUrl: string;
  authType: ApiConnectionAuthType;
  authHeaderName: string | null;
  secret?: string;
  defaultHeaders: Record<string, string>;
  operations: ApiConnectionFormValues['operations'];
  testOperationName: string | null;
  testArguments: Record<string, unknown> | null;
  openApiSpecUrl: string | null;
};

// The key is write-only: it is sent only when the user typed one, so an
// update without it keeps the stored key.
export const buildApiConnectionInput = (
  formValues: ApiConnectionFormValues,
): ApiConnectionInput => ({
  name: formValues.name,
  baseUrl: formValues.baseUrl,
  authType: formValues.authType as ApiConnectionAuthType,
  authHeaderName:
    formValues.authType === 'API_KEY_HEADER' ? formValues.authHeaderName : null,
  ...(formValues.authType !== 'NONE' &&
    isNonEmptyString(formValues.secret) && { secret: formValues.secret }),
  defaultHeaders: Object.fromEntries(
    formValues.defaultHeaders
      .filter((header) => isNonEmptyString(header.name))
      .map((header) => [header.name, header.value]),
  ),
  operations: formValues.operations,
  testOperationName: isNonEmptyString(formValues.testOperationName)
    ? formValues.testOperationName
    : null,
  testArguments: parseJsonObjectText(formValues.testArguments).value,
  openApiSpecUrl: isNonEmptyString(formValues.openApiSpecUrl)
    ? formValues.openApiSpecUrl
    : null,
});
