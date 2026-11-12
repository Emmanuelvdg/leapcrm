import { type ApiConnectionOperation } from '@/settings/api-connections/types/ApiConnectionOperation';
import { type ApiConnectionFormValues } from '@/settings/api-connections/validation-schemas/apiConnectionFormSchema';
import { isDefined } from 'twenty-shared/utils';
import { type ApiConnectionFragmentFragment } from '~/generated-metadata/graphql';

export const toApiConnectionFormValues = (
  apiConnection: ApiConnectionFragmentFragment,
): ApiConnectionFormValues => ({
  name: apiConnection.name,
  baseUrl: apiConnection.baseUrl,
  authType: apiConnection.authType,
  authHeaderName: apiConnection.authHeaderName ?? '',
  secret: '',
  defaultHeaders: Object.entries(
    (apiConnection.defaultHeaders ?? {}) as Record<string, string>,
  ).map(([name, value]) => ({ name, value })),
  operations: (apiConnection.operations ?? []) as ApiConnectionOperation[],
  testOperationName: apiConnection.testOperationName ?? '',
  testArguments: isDefined(apiConnection.testArguments)
    ? JSON.stringify(apiConnection.testArguments, null, 2)
    : '',
  openApiSpecUrl: apiConnection.openApiSpecUrl ?? '',
});
