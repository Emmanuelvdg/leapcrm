import { type z } from 'zod';

import { type apiConnectionOperationSchema } from 'src/engine/core-modules/api-connection/schemas/api-connection-operation.schema';

export type ApiConnectionOperation = z.infer<
  typeof apiConnectionOperationSchema
>;

export type ApiConnectionOperationParameter =
  ApiConnectionOperation['parameters'][number];
