import { type ApiConnectionOperation } from '@/settings/api-connections/types/ApiConnectionOperation';

// Operation names are unique per connection, so an incoming operation
// replaces an existing one with the same name instead of duplicating it.
export const mergeApiConnectionOperations = (
  existingOperations: ApiConnectionOperation[],
  incomingOperations: ApiConnectionOperation[],
): ApiConnectionOperation[] => {
  const incomingByName = new Map(
    incomingOperations.map((operation) => [operation.name, operation]),
  );

  const merged = existingOperations.map(
    (operation) => incomingByName.get(operation.name) ?? operation,
  );

  const existingNames = new Set(
    existingOperations.map((operation) => operation.name),
  );

  return [
    ...merged,
    ...incomingOperations.filter(
      (operation) => !existingNames.has(operation.name),
    ),
  ];
};
