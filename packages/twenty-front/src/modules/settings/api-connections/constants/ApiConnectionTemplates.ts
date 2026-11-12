import { type ApiConnectionFormValues } from '@/settings/api-connections/validation-schemas/apiConnectionFormSchema';

export type ApiConnectionTemplate = {
  id: string;
  label: string;
  values: Omit<ApiConnectionFormValues, 'secret'>;
};

export const API_CONNECTION_TEMPLATES: ApiConnectionTemplate[] = [
  {
    id: 'getleads',
    label: 'GetLeads',
    values: {
      name: 'GetLeads',
      baseUrl: 'https://app.getleads.io/api/v1',
      authType: 'BEARER',
      authHeaderName: '',
      defaultHeaders: [],
      operations: [
        {
          name: 'search_contacts_count',
          description:
            'Count contacts in the GetLeads database that match the filters. Free; returns only a count.',
          method: 'POST',
          path: '/contacts/search/count',
          parameters: [],
          // GetLeads does not publish its filter list, so other filters
          // pass through as extra body properties.
          requestBodySchema: {
            type: 'object',
            properties: {
              company_size_min: {
                type: 'integer',
                description: 'Minimum number of employees at the company',
              },
            },
            additionalProperties: true,
          },
          isEnabled: true,
        },
      ],
      testOperationName: 'search_contacts_count',
      testArguments: JSON.stringify({ company_size_min: 1 }, null, 2),
      openApiSpecUrl: '',
    },
  },
];
