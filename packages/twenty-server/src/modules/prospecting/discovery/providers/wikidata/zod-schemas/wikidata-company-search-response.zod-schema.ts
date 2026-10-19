import { z } from 'zod';

const sparqlValueSchema = z.object({ value: z.string() });

export const wikidataCompanySearchResponseSchema = z.object({
  results: z.object({
    bindings: z.array(
      z.object({
        item: sparqlValueSchema,
        name: sparqlValueSchema.optional(),
        itemDescription: sparqlValueSchema.optional(),
        officialWebsite: sparqlValueSchema.optional(),
        leiCode: sparqlValueSchema.optional(),
        employeeCount: sparqlValueSchema.optional(),
        industries: sparqlValueSchema.optional(),
      }),
    ),
  }),
});

export type WikidataCompanyBinding = z.infer<
  typeof wikidataCompanySearchResponseSchema
>['results']['bindings'][number];
