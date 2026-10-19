import { z } from 'zod';

// Only the fields the provider reads; GLEIF adds fields over time and unknown
// keys are ignored.
export const gleifLeiRecordsResponseSchema = z.object({
  meta: z.object({
    pagination: z.object({
      currentPage: z.number().int(),
      lastPage: z.number().int(),
    }),
  }),
  data: z.array(
    z.object({
      attributes: z.object({
        lei: z.string().min(1),
        entity: z.object({
          legalName: z.object({ name: z.string().min(1) }),
          legalAddress: z.object({
            region: z.string().nullable(),
            country: z.string().nullable(),
          }),
          registeredAt: z.object({ id: z.string().nullable() }).nullable(),
          registeredAs: z.string().nullable(),
        }),
      }),
    }),
  ),
});

export type GleifLeiRecordsResponse = z.infer<
  typeof gleifLeiRecordsResponseSchema
>;

export type GleifLeiRecord = GleifLeiRecordsResponse['data'][number];
