import { z } from 'zod';

export const API_CONNECTION_OPERATION_NAME_PATTERN = /^[a-z0-9_]+$/;

export const API_CONNECTION_HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
] as const;

export const apiConnectionOperationParameterSchema = z.object({
  name: z.string().min(1),
  in: z.enum(['path', 'query', 'header']),
  required: z.boolean(),
  description: z.string().optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
});

export const apiConnectionOperationSchema = z.object({
  name: z.string().min(1).max(64).regex(API_CONNECTION_OPERATION_NAME_PATTERN),
  description: z.string(),
  method: z.enum(API_CONNECTION_HTTP_METHODS),
  path: z.string().startsWith('/'),
  parameters: z.array(apiConnectionOperationParameterSchema),
  requestBodySchema: z.record(z.string(), z.unknown()).nullable(),
  isEnabled: z.boolean(),
});

export const apiConnectionOperationsSchema = z.array(
  apiConnectionOperationSchema,
);
