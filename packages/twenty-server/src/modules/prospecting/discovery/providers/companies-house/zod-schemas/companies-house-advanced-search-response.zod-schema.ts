import { z } from 'zod';

// Only the fields the provider reads; unknown keys are ignored.
export const companiesHouseAdvancedSearchResponseSchema = z.object({
  hits: z.number().int().nonnegative(),
  items: z.array(
    z.object({
      company_name: z.string().min(1),
      company_number: z.string().min(1),
      registered_office_address: z
        .object({
          region: z.string().optional(),
          country: z.string().optional(),
        })
        .optional(),
      sic_codes: z.array(z.string()).optional(),
    }),
  ),
});

export type CompaniesHouseAdvancedSearchResponse = z.infer<
  typeof companiesHouseAdvancedSearchResponseSchema
>;

export type CompaniesHouseCompany =
  CompaniesHouseAdvancedSearchResponse['items'][number];
