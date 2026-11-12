import { isValidUrl } from 'twenty-shared/utils';
import { z } from 'zod';

import { parseJsonObjectText } from '@/settings/api-connections/utils/parseJsonObjectText';

const apiConnectionOperationFormSchema = z.object({
  name: z.string(),
  description: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string(),
  parameters: z.array(
    z.object({
      name: z.string(),
      in: z.enum(['path', 'query', 'header']),
      required: z.boolean(),
      description: z.string().optional(),
      schema: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
  requestBodySchema: z.record(z.string(), z.unknown()).nullable(),
  isEnabled: z.boolean(),
});

export const apiConnectionFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    baseUrl: z
      .string()
      .trim()
      .min(1, 'Base URL is required')
      .refine((url) => isValidUrl(url), { error: 'Please enter a valid URL' }),
    authType: z.enum(['BEARER', 'API_KEY_HEADER', 'NONE']),
    authHeaderName: z.string().trim(),
    secret: z.string().trim(),
    defaultHeaders: z.array(
      z.object({ name: z.string().trim(), value: z.string() }),
    ),
    operations: z.array(apiConnectionOperationFormSchema),
    testOperationName: z.string(),
    testArguments: z
      .string()
      .refine((text) => parseJsonObjectText(text).isValid, {
        error: 'Test arguments must be a JSON object',
      }),
    openApiSpecUrl: z.string().trim(),
  })
  .refine(
    (values) =>
      values.authType !== 'API_KEY_HEADER' || values.authHeaderName !== '',
    { error: 'Header name is required', path: ['authHeaderName'] },
  );

export type ApiConnectionFormValues = z.infer<typeof apiConnectionFormSchema>;
