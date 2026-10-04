import { isValidUrl } from 'twenty-shared/utils';
import { z } from 'zod';

const urlField = () =>
  z
    .string()
    .trim()
    .min(1, 'URL is required')
    .refine((url) => isValidUrl(url), {
      error: 'Please enter a valid URL',
    });

export const mcpServerConnectionFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  serverUrl: urlField(),
  authMethod: z.enum(['OAUTH', 'API_KEY']),
  apiKey: z.string().trim().optional(),
  useManualOverrides: z.boolean(),
  authorizationEndpoint: z.string().trim().optional(),
  tokenEndpoint: z.string().trim().optional(),
  clientId: z.string().trim().optional(),
  clientSecret: z.string().trim().optional(),
});

export type McpServerConnectionFormValues = z.infer<
  typeof mcpServerConnectionFormSchema
>;
