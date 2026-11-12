import { API_CONNECTION_TEMPLATES } from '@/settings/api-connections/constants/ApiConnectionTemplates';
import { buildApiConnectionInput } from '@/settings/api-connections/utils/buildApiConnectionInput';
import { type ApiConnectionFormValues } from '@/settings/api-connections/validation-schemas/apiConnectionFormSchema';

const PLACEHOLDER_KEY = 'glb_live_PLACEHOLDER_KEY';

const getLeadsTemplate = API_CONNECTION_TEMPLATES.find(
  (template) => template.id === 'getleads',
);

const getLeadsFormValues: ApiConnectionFormValues = {
  ...getLeadsTemplate!.values,
  secret: PLACEHOLDER_KEY,
};

describe('buildApiConnectionInput', () => {
  it('builds the GetLeads input from the template', () => {
    expect(buildApiConnectionInput(getLeadsFormValues)).toEqual({
      name: 'GetLeads',
      baseUrl: 'https://app.getleads.io/api/v1',
      authType: 'BEARER',
      authHeaderName: null,
      secret: PLACEHOLDER_KEY,
      defaultHeaders: {},
      operations: getLeadsFormValues.operations,
      testOperationName: 'search_contacts_count',
      testArguments: { company_size_min: 1 },
      openApiSpecUrl: null,
    });
  });

  it('omits an empty key so an update keeps the stored one', () => {
    expect(
      buildApiConnectionInput({ ...getLeadsFormValues, secret: '' }),
    ).not.toHaveProperty('secret');
  });

  it('never sends a key when auth is NONE', () => {
    expect(
      buildApiConnectionInput({ ...getLeadsFormValues, authType: 'NONE' }),
    ).not.toHaveProperty('secret');
  });

  it('keeps the header name only for API key header auth and drops blank headers', () => {
    const input = buildApiConnectionInput({
      ...getLeadsFormValues,
      authType: 'API_KEY_HEADER',
      authHeaderName: 'X-API-Key',
      defaultHeaders: [
        { name: 'X-Client', value: 'leap' },
        { name: '', value: 'ignored' },
      ],
      testOperationName: '',
      testArguments: '',
    });

    expect(input).toMatchObject({
      authHeaderName: 'X-API-Key',
      defaultHeaders: { 'X-Client': 'leap' },
      testOperationName: null,
      testArguments: null,
    });
  });
});
