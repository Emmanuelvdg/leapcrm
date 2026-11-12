export type ApiConnectionHttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE';

export type ApiConnectionOperationParameter = {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  description?: string;
  schema?: Record<string, unknown>;
};

export type ApiConnectionOperation = {
  name: string;
  description: string;
  method: ApiConnectionHttpMethod;
  path: string;
  parameters: ApiConnectionOperationParameter[];
  requestBodySchema: Record<string, unknown> | null;
  isEnabled: boolean;
};
