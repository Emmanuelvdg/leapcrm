import { isValidCountryCode } from 'twenty-shared/utils';
import { z } from 'zod';

export const PROSPECTING_ICP_INDUSTRY_CODE_SCHEMES = [
  'SSIC',
  'SIC',
  'NAICS',
  'NACE',
  'ISIC',
] as const;

const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(isValidCountryCode, {
    message: 'must be a two-letter ISO country code',
  });

const buildLabelListSchema = (maxLabelLength: number) =>
  z.array(z.string().trim().min(1).max(maxLabelLength)).max(50).default([]);

export const prospectingIcpSchema = z
  .strictObject(
    {
      targetGeographies: z
        .array(
          z.strictObject({
            countryCode: countryCodeSchema,
            regions: buildLabelListSchema(100),
          }),
        )
        .max(250)
        .default([]),
      targetIndustries: buildLabelListSchema(200),
      industryCodes: z
        .array(
          z.strictObject({
            scheme: z.enum(PROSPECTING_ICP_INDUSTRY_CODE_SCHEMES),
            code: z.string().trim().min(1).max(20),
          }),
        )
        .max(100)
        .default([]),
      employeeCountMin: z.number().int().min(0).nullable().default(null),
      employeeCountMax: z.number().int().min(0).nullable().default(null),
      keywords: buildLabelListSchema(100),
      excludedCountryCodes: z.array(countryCodeSchema).max(250).default([]),
      excludedDomains: z
        .array(z.string().trim().toLowerCase().min(1).max(253))
        .max(500)
        .default([]),
    },
    { error: 'Add an ideal customer profile to the campaign' },
  )
  .refine(
    (icp) =>
      icp.employeeCountMin === null ||
      icp.employeeCountMax === null ||
      icp.employeeCountMin <= icp.employeeCountMax,
    {
      message: 'must not be lower than employeeCountMin',
      path: ['employeeCountMax'],
    },
  )
  // Without any criterion, discovery would page through whole registries.
  .refine(
    (icp) =>
      icp.targetGeographies.length > 0 ||
      icp.targetIndustries.length > 0 ||
      icp.industryCodes.length > 0 ||
      icp.keywords.length > 0,
    {
      message:
        'add at least one target country, industry, industry code or keyword',
    },
  );

export type ProspectingIcp = z.infer<typeof prospectingIcpSchema>;
